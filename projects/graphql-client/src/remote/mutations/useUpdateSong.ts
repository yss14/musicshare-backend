import gql from "graphql-tag"
import { shareSongKeys, ShareSong, Nullable, SongUpdateInput } from "@musicshare/shared-types"
import {
	TransformedGraphQLMutation,
	useGraphQLMutation,
	IGraphQLMutationOpts,
	typedQueryCache,
} from "../../react-query-graphql"
import { GET_DIRTY_SHARE_SONGS } from "../queries/useDirtyShareSongs"
import { GET_DIRTY_MERGED_VIEW_SONGS } from "../queries/useDirtyMergedViewSongs"
import { GET_PLAYLIST_WITH_SONGS } from "../queries/usePlaylistSongs"

export interface ISongUpdateInput {
	title?: string
	suffix?: string
	year?: number
	bpm?: number
	releaseDate?: string
	isRip?: boolean
	artists?: string[]
	remixer?: string[]
	featurings?: string[]
	type?: string
	genres?: string[]
	label?: string
	tags?: string[]
}

export interface IUpdateSongData {
	updateSong: ShareSong
}

export interface IUpdateSongVariables {
	shareID: string
	songID: string
	song: Nullable<SongUpdateInput>
}

export const UPDATE_SONG = TransformedGraphQLMutation<IUpdateSongData, IUpdateSongVariables>(gql`
	mutation updateSong($shareID: String!, $songID: String!, $song: SongUpdateInput!){
		updateSong(shareID: $shareID, songID: $songID, song: $song){
			${shareSongKeys}
		}
	}
`)((data) => data.updateSong)

export const useUpdateSong = (playlistID?: string, opts?: IGraphQLMutationOpts<typeof UPDATE_SONG>) => {
	const mutation = useGraphQLMutation(UPDATE_SONG, {
		...opts,
		onSuccess: (updatedSong, variables) => {
			typedQueryCache.invalidateTypedQuery({
				query: GET_DIRTY_SHARE_SONGS,
			})
			typedQueryCache.invalidateTypedQuery({
				query: GET_DIRTY_MERGED_VIEW_SONGS,
			})

			if (playlistID) {
				console.log({ shareID: updatedSong.shareID, playlistID })
				typedQueryCache.invalidateTypedQuery({
					query: GET_PLAYLIST_WITH_SONGS,
					variables: { shareID: updatedSong.shareID, playlistID },
				})
			}

			if (opts?.onSuccess) opts.onSuccess(updatedSong, variables)
		},
	})

	return mutation
}
