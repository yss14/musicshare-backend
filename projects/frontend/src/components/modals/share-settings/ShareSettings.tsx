import React, { useState, useEffect, useCallback, useMemo } from "react"
import { QuestionCircleOutlined } from "@ant-design/icons"
import { Modal, Input, Table, Button, Alert, Popconfirm, Typography, message, Form } from "antd"
import { useDebounce } from "use-debounce/lib"
import {
	useShareUsers,
	useUpdateShareMemberPermissions,
	useRevokeInvitation,
	useInviteToShare,
	useRenameShare,
	useLeaveShare,
	useDeleteShare,
} from "@musicshare/graphql-client"
import Column from "antd/lib/table/Column"
import { Permissions, UserStatus, IShareMember, Permission, Share } from "@musicshare/shared-types"
import { useHistory } from "react-router-dom"
import { useLibraryID } from "../../../graphql/client/queries/libraryid-query"
import styled from "styled-components"
import { EditableTagGroup } from "../../form/EditableTagGroup"

const { Text } = Typography

const FormItemVertical = styled(Form.Item)`
	flex-direction: column;

	& .ant-col {
		text-align: left;
	}
`

interface IShareSettingsProps {
	share: Share
	onClose: () => void
}

export const ShareSettings: React.FC<IShareSettingsProps> = ({ share, onClose }) => {
	const history = useHistory()
	const [deleteShare] = useDeleteShare({
		onSuccess: () => {
			message.success("Share successfully deleted")
			history.push("/")
			onClose()
		},
	})
	const [leaveShare] = useLeaveShare({
		onSuccess: () => {
			message.success("Share successfully left")
			history.push("/")
			onClose()
		},
	})
	const userLibraryID = useLibraryID()
	const isLibrary = share.id === userLibraryID
	const isOwner = useMemo(() => share.userPermissions.includes(Permissions.SHARE_OWNER), [share.userPermissions])
	const canChangeName = isLibrary || isOwner
	const canInvite = !isLibrary && isOwner

	const onLeaveDeleteClick = useCallback(() => {
		if (isOwner) {
			deleteShare({ shareID: share.id })
		} else {
			leaveShare({ input: { shareID: share.id } })
		}
	}, [isOwner, share.id, deleteShare, leaveShare])

	const cancelButton = (
		<Popconfirm
			title={
				isOwner
					? "Are you sure? This action cannot be undone (and is very unstable at the moment)!"
					: "Are you sure? This action will remove all referenced songs from your library and cannot be undone!"
			}
			icon={<QuestionCircleOutlined style={{ color: "red" }} />}
			onConfirm={onLeaveDeleteClick}
		>
			<Button danger>{isOwner ? "Delete Share" : "Leave Share"}</Button>
		</Popconfirm>
	)

	return (
		<Modal
			title="Share Settings"
			okText="OK"
			cancelText={!isLibrary ? cancelButton : null}
			onCancel={onClose}
			onOk={onClose}
			visible={true}
			width="90%"
			cancelButtonProps={{
				style: { border: "none", padding: "0px", display: isLibrary ? "none" : "inline-block" },
				onClick: (e) => e.preventDefault(),
			}}
		>
			<Form>
				{canChangeName && <ChangeSongName share={share} />}
				{canInvite && <ShareUsers shareID={share.id} />}
				{!isOwner && <div>{"You've missing the required permission to edit share settings"}</div>}
			</Form>
		</Modal>
	)
}

const ChangeSongName: React.FC<{ share: Share }> = ({ share: { name, id } }) => {
	const [shareName, setShareName] = useState(name)
	const [inputBlured, setInputBlured] = useState(false)
	const [debouncedShareName] = useDebounce(shareName, 1000)
	const [renameShare] = useRenameShare()

	useEffect(() => {
		if (inputBlured) {
			renameShare({
				shareID: id,
				name: debouncedShareName,
			})
		}
	}, [debouncedShareName, id, renameShare, inputBlured])

	return (
		<FormItemVertical label="Name" validateStatus={shareName.trim().length <= 2 ? "error" : "success"}>
			<Input
				value={shareName}
				type="text"
				onChange={(e) => setShareName(e.target.value)}
				placeholder="Share name"
				onBlur={() => setInputBlured(true)}
			/>
		</FormItemVertical>
	)
}

const ShareUsers: React.FC<{ shareID: string }> = ({ shareID }) => {
	const { data: users, isLoading, error } = useShareUsers(shareID)
	const [email, setEMail] = useState("")
	const [invitationLink, setInvitationLink] = useState<string | null>(null)
	const [inviteError, setInviteError] = useState<string | null>(null)
	const [inviteToShare] = useInviteToShare({
		onSuccess: (invitationLink) => {
			if (invitationLink !== null) {
				setInvitationLink(invitationLink)
			}

			message.success(`User ${email} succesfully invited`)

			setEMail("")
		},
		onError: (err) => setInviteError(err.message),
	})
	const [revokeInvitation] = useRevokeInvitation({
		onSuccess: () => {
			setInvitationLink(null)

			message.success(`User invitation successfully revoked`)
		},
	})
	const [updatePermissions] = useUpdateShareMemberPermissions()

	const onInviteClick = useCallback(() => {
		inviteToShare({
			input: {
				shareID,
				email,
			},
		})
	}, [inviteToShare, shareID, email])

	const onRevokeInvitationClick = useCallback(
		(userID: string) => {
			revokeInvitation({
				input: {
					shareID,
					userID,
				},
			})
		},
		[revokeInvitation, shareID],
	)

	const onPermissionsValueChange = useCallback(
		(user: IShareMember, permissions: string[]) => {
			if (permissions.every((perm) => Permissions.ALL.includes(perm as Permission))) {
				updatePermissions({
					permissions,
					userID: user.id,
					shareID: user.shareID,
				})
			}
		},
		[updatePermissions],
	)

	if (error) return <div>Error</div>

	return (
		<>
			<FormItemVertical label="Members">
				<Table
					dataSource={users || []}
					pagination={false}
					loading={isLoading}
					scroll={{ y: 300 }}
					rowKey={(user) => user.id}
				>
					<Column title="Name" dataIndex="name" key="name" />
					<Column title="E-Mail" dataIndex="email" key="email" />
					<Column title="Status" dataIndex="status" key="status" width={100} />
					<Column
						title="Actions"
						key="actions"
						width={120}
						render={(_, user: IShareMember) => (
							<>
								{user.status === UserStatus.Pending && (
									<Button type="link" onClick={() => onRevokeInvitationClick(user.id)}>
										Revoke
									</Button>
								)}
							</>
						)}
					/>
					<Column
						title="Permissions"
						key="permissions"
						render={(_, user: IShareMember) => {
							return (
								<EditableTagGroup
									values={user.permissions}
									placeholder="Permissions"
									datasource={Permissions.ALL}
									onValuesChange={(permissions) => onPermissionsValueChange(user, permissions)}
								/>
							)
						}}
					/>
				</Table>
			</FormItemVertical>
			{invitationLink && (
				<Alert
					message={
						<>
							<span>Invitation link: </span>
							<Text code>{invitationLink}</Text>
						</>
					}
					type="success"
					closable
					onClose={() => setInvitationLink(null)}
				/>
			)}
			{inviteError && (
				<Alert
					message={inviteError.replace("GraphQL error: ", "")}
					type="error"
					closable
					onClose={() => setInviteError(null)}
				/>
			)}
			<FormItemVertical label="E-Mail">
				<Input
					value={email}
					type="email"
					onChange={(e) => setEMail(e.target.value)}
					placeholder="example@domain.com"
					width={300}
				/>
				<Button type="dashed" onClick={onInviteClick}>
					Invite
				</Button>
			</FormItemVertical>
		</>
	)
}
