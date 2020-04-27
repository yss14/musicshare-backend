import React, { useRef, useEffect } from "react"
import { ListRowProps } from "react-virtualized"
import { IRowEvents } from "./SongTable"
import { DragElementWrapper, DragPreviewOptions, DragPreviewImage, useDrop } from "react-dnd"
import { IScopedSong } from "../../graphql/types"
import { Row, Col } from "./SongTableUI"
import songDragPreviewImg from "../../images/playlist_add.png"
import { DragNDropItem, ISongDNDItem } from "../../types/DragNDropItems"
import { MoveSong } from "./MoveSong"
import { ISongTableColumn, CalculatedColumnWidths } from "./song-table-columns"

interface ISongRowProps extends ListRowProps {
	columns: ISongTableColumn[]
	song: IScopedSong
	rowEvents?: IRowEvents
	hovered: boolean
	onMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, ref: React.Ref<HTMLDivElement>) => void
	dragPreview: DragElementWrapper<DragPreviewOptions>
	moveSong?: MoveSong
	isPlaylist: boolean
	calculatedColumnWidths: CalculatedColumnWidths
}

export const SongRow: React.FC<ISongRowProps> = ({
	index,
	style,
	rowEvents,
	columns,
	song,
	hovered,
	onMouseEnter,
	dragPreview,
	moveSong,
	isPlaylist,
	calculatedColumnWidths,
}) => {
	const rowRef = useRef<HTMLDivElement>(null)

	const [{ isOver }, drop] = useDrop<ISongDNDItem, void, { isOver: boolean }>({
		accept: DragNDropItem.Song,
		canDrop: () => isPlaylist,
		collect: (monitor) => ({ isOver: isPlaylist && monitor.isOver() }),
		drop: (item) => {
			if (moveSong) {
				moveSong(item.song, song)
			}
		},
	})

	useEffect(() => {
		if (rowRef.current) {
			drop(rowRef.current)
		}
	}, [rowRef, drop])

	const onClick = (event: React.MouseEvent) =>
		rowEvents && rowEvents.onClick ? rowEvents.onClick(event, song, index) : undefined
	const onContextMenu = (event: React.MouseEvent) =>
		rowEvents && rowEvents.onContextMenu ? rowEvents.onContextMenu(event, song, index) : undefined
	const onDoubleClick = (event: React.MouseEvent) =>
		rowEvents && rowEvents.onDoubleClick ? rowEvents.onDoubleClick(event, song, index) : undefined

	return (
		<>
			<Row
				ref={rowRef}
				style={{
					...style,
					backgroundColor: isOver ? "#2587fa" : hovered ? "#e6f6ff" : "transparent",
				}}
				onClick={onClick}
				onContextMenu={onContextMenu}
				onDoubleClick={onDoubleClick}
				onMouseEnter={(e) => (onMouseEnter ? onMouseEnter(e, rowRef) : undefined)}
			>
				{columns.map((column) => (
					<Col
						key={`song-${song.id}-${index}-${column.title}`}
						style={{ width: calculatedColumnWidths[column.key] }}
					>
						{column.render(song, index)}
					</Col>
				))}
			</Row>
			<DragPreviewImage connect={dragPreview} src={songDragPreviewImg} />
		</>
	)
}
