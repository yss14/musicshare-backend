import { useApolloClient } from "react-apollo";
import { useMemo } from "react";
import { getSongMediaURL } from "../graphql/programmatic/get-song-mediaurl";
import { IBaseSong } from "../graphql/types";

export const useSongUtils = () => {
	const apolloClient = useApolloClient();
	const fetchSongMediaURL = useMemo(() => getSongMediaURL(apolloClient), [apolloClient]);

	const makePlayableSong = (song: IBaseSong) => ({
		...song,
		getMediaURL: () => fetchSongMediaURL(song.libraryID, song.id)
	});

	return { makePlayableSong }
}
