import gql from "graphql-tag"
import { MutationHookOptions, useMutation, MutationUpdaterFn } from "@apollo/client"
import { useCallback } from "react"
import { IGetMergedPlaylistData, GET_MERGED_PLAYLISTS } from "../queries/merged-playlists-query"
import { queryCache } from "react-query"
import { getQueryKey, GET_SHARE_PLAYLISTS } from "@musicshare/graphql-client"

interface IRenamePlaylistData {
	renamePlaylist: boolean
}

interface IRenamePlaylistVariables {
	newName: string
	shareID: string
	playlistID: string
}

const RENAME_PLAYLIST_MUTATION = gql`
	mutation RenamePlaylist($newName: String!, $playlistID: String!, $shareID: String!) {
		renamePlaylist(newName: $newName, playlistID: $playlistID, shareID: $shareID)
	}
`

export const useRenamePlaylist = (opts?: MutationHookOptions<IRenamePlaylistData, IRenamePlaylistVariables>) => {
	const makeUpdatePlaylistCache = useCallback(
		(
			newName: string,
			shareID: string,
			playlistID: string,
			isMergedView: boolean,
		): MutationUpdaterFn<IRenamePlaylistData> => (cache) => {
			if (!isMergedView) {
				queryCache.invalidateQueries(getQueryKey(GET_SHARE_PLAYLISTS))
			} else {
				const mergedPlaylistsQuery = cache.readQuery<IGetMergedPlaylistData, void>({
					query: GET_MERGED_PLAYLISTS,
				})

				if (mergedPlaylistsQuery) {
					cache.writeQuery<IGetMergedPlaylistData, void>({
						query: GET_MERGED_PLAYLISTS,
						data: {
							...mergedPlaylistsQuery,
							viewer: {
								...mergedPlaylistsQuery.viewer,
								shares: mergedPlaylistsQuery.viewer.shares.map((share) =>
									share.id === shareID
										? {
												...share,
												playlists: share.playlists.map((playlist) =>
													playlist.id === playlistID
														? { ...playlist, name: newName }
														: playlist,
												),
										  }
										: share,
								),
							},
						},
					})
				}
			}
		},
		[],
	)

	const [renamePlaylistMutation, other] = useMutation<IRenamePlaylistData, IRenamePlaylistVariables>(
		RENAME_PLAYLIST_MUTATION,
		opts,
	)

	const renamePlaylist = useCallback(
		(newName: string, shareID: string, playlistID: string, isMergedView: boolean) => {
			renamePlaylistMutation({
				variables: { newName, playlistID, shareID },
				update: makeUpdatePlaylistCache(newName, shareID, playlistID, isMergedView),
			})
		},
		[renamePlaylistMutation, makeUpdatePlaylistCache],
	)

	return [renamePlaylist, other] as const
}
