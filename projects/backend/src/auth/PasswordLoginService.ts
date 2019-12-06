import * as argon2 from 'argon2';
import { UserLoginCredentialsTable, Tables, UsersTable } from '../database/tables';
import { IDatabaseClient, SQL } from 'postgres-schema-builder';
import { IAuthenticationService } from './AuthenticationService';
import { IUserService } from '../services/UserService';
import * as crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import { NotFoundError } from '../types/errors/NotFound';
import { Where } from 'postgres-schema-builder'


interface IRegsiterArgs {
	password: string;
	userID: string;
}

interface IPasswordLoginServiceArgs {
	database: IDatabaseClient;
	authService: IAuthenticationService;
	userService: IUserService;
}

export class LoginNotFound extends Error {
	constructor(email: string) {
		super(`Login for email ${email} not found`);
	}
}

export class CredentialsInvalid extends Error {
	constructor() {
		super(`Credentials invalid`);
	}
}

export type IPasswordLoginService = ReturnType<typeof PasswordLoginService>

export const PasswordLoginService = ({ authService, database, userService }: IPasswordLoginServiceArgs) => {
	const register = async ({ userID, password }: IRegsiterArgs) => {
		const passwordHashed = await hashPassword(password);
		const restoreToken = crypto.createHash('md5').update(uuid()).digest('hex').toUpperCase()

		await database.query(UserLoginCredentialsTable.insertFromObj({
			user_id_ref: userID,
			credential: passwordHashed,
			restore_token: restoreToken,
			date_added: new Date(),
			date_removed: null,
		}));

		return restoreToken
	}

	const login = async (email: string, password: string) => {
		const getUserCredentialsQuery = SQL.raw<typeof Tables.user_login_credentials>(`
			SELECT uc.* FROM ${UserLoginCredentialsTable.name} uc
			INNER JOIN ${UsersTable.name} u ON u.user_id = uc.user_id_ref
			WHERE u.email = $1 AND uc.date_removed IS NULL;
		`, [email]);

		const loginCredentials = await database.query(getUserCredentialsQuery);

		if (loginCredentials.length === 0) {
			throw new LoginNotFound(email);
		}

		const credentialsValid = await argon2.verify(loginCredentials[0].credential, password);

		if (!credentialsValid) {
			throw new CredentialsInvalid();
		}

		const user = await userService.getUserByEMail(email);

		const refreshToken = await authService.issueRefreshToken(user, '90 days');

		return refreshToken;
	}

	const changePassword = async (userID: string, oldPassword: string, newPassword: string) => {
		const newPasswordHashed = await hashPassword(newPassword)

		const getUserCredentialsByID = SQL.raw<typeof Tables.user_login_credentials>(`
			SELECT * 
			FROM ${UserLoginCredentialsTable.name}
			WHERE user_id_ref = $1 AND date_removed IS NULL;
		`, [userID])

		const dbResults = await database.query(getUserCredentialsByID)

		if (dbResults.length !== 1) {
			throw new CredentialsInvalid()
		}

		const currentPassword = dbResults[0].credential
		const credentialsValid = await argon2.verify(currentPassword, oldPassword)

		if (!credentialsValid) {
			throw new CredentialsInvalid();
		}

		const updatePasswordQuery = UserLoginCredentialsTable.update(['credential'], ['user_id_ref'])

		await database.query(updatePasswordQuery([newPasswordHashed], [userID]))
	}

	const getRestoreToken = async (userID: string) => {
		const dbResults = await database.query(
			UserLoginCredentialsTable.select('*', ['user_id_ref', 'date_removed'])([userID, Where.isNull()])
		)

		if (dbResults.length === 1 && dbResults[0].restore_token) {
			return dbResults[0].restore_token
		} else {
			throw new NotFoundError(`Restore token for user ${userID} not found`)
		}
	}

	const hashPassword = (password: string) => argon2.hash(password);

	return {
		register,
		login,
		changePassword,
		getRestoreToken,
	}
}