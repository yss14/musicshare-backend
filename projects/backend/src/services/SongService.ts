import { ShareSong, shareSongFromDBResult } from '../models/SongModel';
import { sortByTimeUUIDAsc } from '../utils/sort/sort-timeuuid';
import { TimeUUID } from '../types/TimeUUID';
import { IDatabaseClient } from 'cassandra-schema-builder';
import { ISongByShareDBResult, SongsByShareTable } from '../database/schema/tables';
import { SongUpdateInput } from '../inputs/SongInput';
import * as snakeCaseObjKeys from 'snakecase-keys';

export class SongNotFoundError extends Error {
	constructor(shareID: string, songID: string) {
		super(`Song with id ${songID} not found in share ${shareID}`);
	}
}

export interface ISongService {
	getByID(shareID: string, songID: string): Promise<ShareSong>;
	getByShare(shareID: string): Promise<ShareSong[]>;
	getByShareDirty(shareID: string, lastTimestamp: number): Promise<ShareSong[]>;
	create(song: ISongByShareDBResult): Promise<string>;
	update(shareID: string, songID: string, song: SongUpdateInput): Promise<void>;
}

export class SongService implements ISongService {
	constructor(
		private readonly database: IDatabaseClient,
	) { }

	public async getByID(shareID: string, songID: string): Promise<ShareSong> {
		const dbResults = await this.database.query(
			SongsByShareTable.select('*', ['share_id', 'id'])
				([TimeUUID(shareID), TimeUUID(songID)])
		)

		if (dbResults.length === 0) {
			throw new SongNotFoundError(shareID, songID);
		}

		return shareSongFromDBResult(dbResults[0]);

	}

	public async getByShare(shareID: string): Promise<ShareSong[]> {
		const dbResults = await this.database.query(
			SongsByShareTable.select('*', ['share_id'])([TimeUUID(shareID)])
		);

		return dbResults
			.map(shareSongFromDBResult)
			.sort((lhs, rhs) => sortByTimeUUIDAsc(lhs.id, rhs.id));
	}

	public async getByShareDirty(shareID: string, lastTimestamp: number): Promise<ShareSong[]> {
		const songs = await this.getByShare(shareID);

		return songs.filter(song => song.dateLastEdit > lastTimestamp);
	}

	public async create(song: ISongByShareDBResult): Promise<string> {
		// istanbul ignore next
		let id = song.id || TimeUUID();

		await this.database.query(
			SongsByShareTable.insertFromObj(song)
		);

		return id.toString();
	}

	public async update(shareID: string, songID: string, song: SongUpdateInput): Promise<void> {
		const inputSnakeCased: Partial<ISongByShareDBResult> = {
			...snakeCaseObjKeys(song),
			date_last_edit: new Date(),
		}

		await this.database.query(
			SongsByShareTable.update(Object.keys(inputSnakeCased) as any, ['id', 'share_id'])
				(Object.values(inputSnakeCased), [TimeUUID(songID), TimeUUID(shareID)])
		);
	}
}