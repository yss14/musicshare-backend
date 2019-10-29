import gql from "graphql-tag";
import { shareSongKeys, IShareSong } from "../types";
import { Query } from "react-apollo";
import { useQuery } from "@apollo/react-hooks";

export const GET_SHARE_WITH_SONGS = gql`
  query share($shareID: String!) {
    share(shareID: $shareID) {
      id
      name
      songs {
        ${shareSongKeys}
      }
    }
  }
`;

export interface IGetShareWithSongsData {
	share: {
		id: string;
		name: string;
		songs: IShareSong[];
	}
}

export interface IGetShareWithSongsVariables {
	shareID: string;
}

export class ShareWithSongs extends Query<IGetShareWithSongsData, IGetShareWithSongsVariables>{ }

export const useShareSongs = (shareID: string) =>
	useQuery<IGetShareWithSongsData, IGetShareWithSongsVariables>(GET_SHARE_WITH_SONGS, { variables: { shareID } });