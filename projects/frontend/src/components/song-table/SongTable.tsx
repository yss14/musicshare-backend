import React, { useState, useEffect } from "react";
import { Table } from "antd";
import { IShareSong, IBaseSong, IPlaylist, IScopedSong } from "../../graphql/types";
import { buildSongName } from "../../utils/songname-builder";
import { formatDuration } from "../../utils/format-duration";
import { DragNDropItem } from "../../types/DragNDropItems";
import { useDrag, DragSourceMonitor, DragPreviewImage } from "react-dnd";
import { useAddSongsToPlaylist } from "../../graphql/mutations/add-songs-to-playlist";
import { setComponents, VTComponents } from 'virtualizedtableforantd'
import songDragPreviewImg from '../../images/playlist_add.png'
import styled from "styled-components";
import { isMutableRef } from "../../types/isMutableRef";

const columns = [
	{
		title: "Title",
		width: 250,
		key: "title",
		render: (song: IShareSong) => <span>{buildSongName(song)}</span>
	},
	{
		title: "Time",
		width: 40,
		dataIndex: "duration",
		key: "duration",
		render: (duration: number) => formatDuration(duration)
	},
	{
		title: "Artists",
		dataIndex: "artists",
		width: 150,
		key: "artists",
		render: (artists: string[]) =>
			artists.join(', ')
	},
	{
		title: "Genres",
		dataIndex: "genres",
		width: 150,
		key: "genres",
		render: (genres: string[]) =>
			genres.join(', ')
	}
];

const CustomTHElement = styled.th`
	padding: 4px 6px !important;
    border-top: 1px solid #dcdcdc;
    border-bottom: 1px solid #dcdcdc !important;
`

const CustomTRElement = styled.tr`
	&:nth-child(odd){
		/*background-color: #f3f3f3;*/
	}
	& > td{
		padding: 3px 6px !important;
	}
`

interface ISongTableRowProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement> {
	song: IBaseSong;
}

const DragableSongRow = React.forwardRef<HTMLTableRowElement, ISongTableRowProps>(({ song, children, ...props }, ref) => {
	const addSongsToPlaylist = useAddSongsToPlaylist()
	const [, drag, dragPreview] = useDrag({
		item: { type: DragNDropItem.Song, song },
		end: (item: { song: IBaseSong } | undefined, monitor: DragSourceMonitor) => {
			const dragResult = monitor.getDropResult() as { playlist: IPlaylist }

			if (item && dragResult && dragResult.playlist) {
				addSongsToPlaylist(dragResult.playlist.shareID, dragResult.playlist.id, [song.id])
			}
		},
	})

	useEffect(() => {
		if (isMutableRef(ref)) {
			drag(ref.current)
		}
	}, [ref, drag])

	return (
		<CustomTRElement {...props} ref={ref}>
			<DragPreviewImage connect={dragPreview} src={songDragPreviewImg} />
			{children}
		</CustomTRElement>
	)
})

interface ISongTableProps {
	songs: IScopedSong[];
	onRowClick: (event: React.MouseEvent, song: IScopedSong, index: number) => void;
	onRowDoubleClick: (event: React.MouseEvent, song: IScopedSong, index: number) => void;
	onRowContextMenu: (event: React.MouseEvent, song: IScopedSong) => void;
}

export const SongTable = ({ songs, onRowClick, onRowContextMenu, onRowDoubleClick }: ISongTableProps) => {
	const [height, setHeight] = useState(0);
	const updateDimensions = () => {
		setHeight(window.innerHeight);
	}

	useEffect(() => {
		updateDimensions();
		window.addEventListener("resize", updateDimensions);

		setComponents(1000, {
			header: {
				cell: CustomTHElement,
			},
			body: {
				row: DragableSongRow,
			}
		})

		return () => {
			window.removeEventListener("resize", updateDimensions);
		};
	}, []);

	return (
		<>
			<Table
				size="middle"
				columns={columns}
				dataSource={songs}
				rowKey={(song) => "song-key-" + song.id}
				pagination={false}
				scroll={{ y: height - 192 }}
				onRow={(record: IScopedSong, index) => ({
					onClick: event => onRowClick(event, record, index),
					onContextMenu: event => onRowContextMenu(event, record),
					onDoubleClick: event => onRowDoubleClick(event, record, index),
					song: record,
				})}
				components={VTComponents({ id: 1000 })}
			/>
		</>
	);
};

