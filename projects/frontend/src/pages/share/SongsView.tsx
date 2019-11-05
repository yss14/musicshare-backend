import React, { useRef, useState } from "react";
import { IBaseSong } from "../../graphql/types";
import { useContextMenu } from "../../components/modals/contextmenu/ContextMenu";
import { useSongUtils } from "../../hooks/use-song-utils";
import { usePlayer } from "../../player/player-hook";
import { SongTableHeader } from "../../components/song-table/SongTableHeader";
import { SongTable } from "../../components/song-table/SongTable";
import { SongModal } from "../../components/modals/song-modal/SongModal";
import { SongContextMenu } from "./SongContextMenu";

interface ISongsViewProps {
	title: string;
	songs: IBaseSong[];
	playlistID?: string;
}

export const SongsView: React.FC<ISongsViewProps> = ({ title, songs, playlistID }) => {
	const contextMenuRef = useRef<HTMLDivElement>(null)
	const { showContextMenu } = useContextMenu(contextMenuRef)
	const { makePlayableSong } = useSongUtils()
	const { changeSong, enqueueSongs, clearQueue } = usePlayer();
	const [editSong, setEditSong] = useState<IBaseSong | null>(null);
	const [showSongModal, setShowSongModal] = useState(false)

	const onRowClick = (event: React.MouseEvent, song: IBaseSong, idx: number) => {
		changeSong(makePlayableSong(song));

		if (songs) {
			const followUpSongs = songs.filter((_, songIdx) => songIdx > idx);

			clearQueue();
			enqueueSongs(followUpSongs.map(makePlayableSong));
		}

		setEditSong(song)
		setShowSongModal(true)
	}

	const onRowContextMenu = (event: React.MouseEvent, song: IBaseSong) => {
		setEditSong(song)

		showContextMenu(event)
	}

	return (
		<>
			<SongTableHeader title={title} songs={songs} />
			<SongTable songs={songs} onRowClick={onRowClick} onRowContextMenu={onRowContextMenu} />
			{editSong && showSongModal ? (
				<SongModal
					songID={editSong.id}
					shareID={editSong.libraryID}
					playlistID={playlistID}
					closeForm={() => setShowSongModal(false)}
				/>)
				: null}
			<SongContextMenu song={editSong} ref={contextMenuRef} onShowInformation={() => setShowSongModal(true)} />
		</>
	);
}