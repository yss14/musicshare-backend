import { IBaseSongPlayable } from "../graphql/types"
import { ISongMediaUrl } from "../graphql/queries/song-mediaurl-query"
import { message } from "antd"
import { v4 as uuid } from "uuid"

const getMediaErrorCode = (event: ErrorEvent) => {
	if (!event.target) {
		return -1
	}

	const target = event.target as HTMLAudioElement

	if (!target.error) {
		return -1
	}

	return target.error.code
}

const mapMediaElementEventError = (event: ErrorEvent) => {
	const mediaErrorCode = getMediaErrorCode(event)

	switch (mediaErrorCode) {
		case MediaError.MEDIA_ERR_ABORTED:
			return "You aborted the video playback."
		case MediaError.MEDIA_ERR_NETWORK:
			return "A network error caused the audio download to fail."
		case MediaError.MEDIA_ERR_DECODE:
			return "The audio playback was aborted due to a corruption problem or because the video used features your browser did not support."
		case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
			return "The audio cannot not be loaded because the server or network failed."
		default:
			return "An unknown error occurred."
	}
}

interface IPlayerDeckArgs {
	onError?: (error: string, code: number) => void
}

export const PlayerDeck = ({ onError }: IPlayerDeckArgs) => {
	const audio = document.createElement("audio")
	audio.style.display = "none"
	document.body.appendChild(audio)

	audio.addEventListener("error", (err) => {
		const target = err.target as HTMLAudioElement

		// don't propagate error if we manually cleared the audio src attribute
		if (!((target && target.src.length === 0) || target.src === window.location.href)) {
			if (onError) onError(mapMediaElementEventError(err), getMediaErrorCode(err))
		}
	})

	return audio
}

const getPlaybackProgress = (deck: HTMLAudioElement) => {
	return deck.currentTime / deck.duration || -1
}

interface IPlaybackStatusEvent {
	type: "playback_status"
	data: boolean
}

const setPlaying = (): IPlaybackStatusEvent => ({ type: "playback_status", data: true })
const setPaused = (): IPlaybackStatusEvent => ({ type: "playback_status", data: false })

interface IPlaybackProgressEvent {
	type: "playback_progress"
	data: number
}

const setProgress = (newProgress: number): IPlaybackProgressEvent => ({ type: "playback_progress", data: newProgress })

interface IBufferingProgressEvent {
	type: "buffering_progress"
	data: number
}

const setBufferingProgress = (newProgress: number): IBufferingProgressEvent => ({
	type: "buffering_progress",
	data: newProgress,
})

interface ISongChangeEvent {
	type: "song_change"
	data: IBaseSongPlayable | null
}

const setSong = (newSong: IBaseSongPlayable | null): ISongChangeEvent => ({ type: "song_change", data: newSong })

interface ISongDurationChangeEvent {
	type: "song_duration_change"
	data: number
}

const setSongDuration = (newDuration: number): ISongDurationChangeEvent => ({
	type: "song_duration_change",
	data: newDuration,
})

interface IPlaybackErrorEvent extends ReturnType<typeof setPlaybackError> {}

const setPlaybackError = (error: string) => ({
	type: "playback_error" as const,
	data: error,
})

interface IUpdateSongQueue extends ReturnType<typeof updateSongQueue> {}

export const updateSongQueue = (newSongQueue: ISongQueueItem[]) => {
	return {
		type: "update_song_queue" as const,
		data: newSongQueue,
	}
}

export type PlayerEvent =
	| IPlaybackStatusEvent
	| IPlaybackProgressEvent
	| ISongChangeEvent
	| ISongDurationChangeEvent
	| IBufferingProgressEvent
	| IPlaybackErrorEvent
	| IUpdateSongQueue

type PlayerEventSubscriber = (event: PlayerEvent) => unknown

export interface ISongQueueItem {
	queueID: string
	song: IBaseSongPlayable
}

export const makeSongQueueItem = (song: IBaseSongPlayable): ISongQueueItem => ({
	queueID: uuid(),
	song,
})

export interface IPlayer {
	play: () => void
	pause: () => void
	next: () => void
	prev: () => void
	changeVolume: (newVolume: number) => void
	changeSong: (newSong: IBaseSongPlayable) => void
	setSongQueue: (items: ISongQueueItem[]) => void
	enqueueSong: (song: IBaseSongPlayable) => void
	enqueueSongs: (songs: IBaseSongPlayable[]) => void
	enqueueSongNext: (song: IBaseSongPlayable) => void
	clearQueue: () => void
	subscribeEvents: (callback: PlayerEventSubscriber) => void
	unsubscribeEvents: (callback: PlayerEventSubscriber) => void
	seek: (newCurrentTime: number) => void
	destroy: () => void
}

export const Player = (): IPlayer => {
	const songQueue: ISongQueueItem[] = []
	const playedSongs: IBaseSongPlayable[] = []
	let currentSong: IBaseSongPlayable | null = null
	let isBufferingNextSong = false
	let playCountIncremented = false

	const eventSubscribers: Set<PlayerEventSubscriber> = new Set()

	const subscribeEvents = (callback: PlayerEventSubscriber) => eventSubscribers.add(callback)
	const unsubscribeEvents = (callback: PlayerEventSubscriber) => eventSubscribers.delete(callback)

	const dispatch = (event: PlayerEvent) => Array.from(eventSubscribers).forEach((subscriber) => subscriber(event))

	const primaryDeck = PlayerDeck({
		onError: (event, code) => onError(event, code, 1),
	})
	const bufferingDeck = PlayerDeck({
		onError: (event, code) => onError(event, code, 2),
	})
	bufferingDeck.volume = 0

	const play = () => primaryDeck.play()
	const pause = () => primaryDeck.pause()
	const changeVolume = (newVolume: number) => (primaryDeck.volume = newVolume)
	const seek = (newCurrentTime: number) => (primaryDeck.currentTime = newCurrentTime)

	const onError = (event: string, code: number, deck: number) => {
		if (deck === 1 && code === MediaError.MEDIA_ERR_NETWORK && currentSong) {
			const currentPlaybackProgress = primaryDeck.currentTime

			currentSong
				.getMediaURL()
				.then((songMediaUrls) => {
					const mediaUrl = pickMediaUrl(songMediaUrls)

					if (mediaUrl) {
						primaryDeck.src = mediaUrl
						primaryDeck.currentTime = currentPlaybackProgress
						primaryDeck.play()
					} else {
						console.warn(`Cannot get a media url of song ${currentSong!.id}`)
					}
				})
				.catch((err) => {
					console.error(err)

					message.error(err.message)
				})
		} else if (deck === 1 && primaryDeck.src.length > 0) {
			dispatch(setPlaybackError(event))
		}
	}

	const pickMediaUrl = (mediaUrls: ISongMediaUrl[]) => {
		const fileUploadMedia = mediaUrls.find((mediaUrl) => mediaUrl.__typename === "FileUpload")

		if (fileUploadMedia) {
			return fileUploadMedia.accessUrl
		}

		return null
	}

	const next = () => {
		if (currentSong) {
			playedSongs.push(currentSong)
		}

		const nextItem = songQueue.shift()
		dispatch(updateSongQueue(songQueue))

		isBufferingNextSong = false
		bufferingDeck.src = ""
		primaryDeck.setAttribute("src", "")

		if (!nextItem) {
			dispatch(setSong(null))
			dispatch(setPaused())

			return false
		}

		nextItem.song
			.getMediaURL()
			.then((songMediaUrls) => {
				dispatch(setSong(nextItem.song))
				currentSong = nextItem.song

				const mediaUrl = pickMediaUrl(songMediaUrls)

				if (mediaUrl) {
					primaryDeck.src = mediaUrl
					primaryDeck.play()

					playCountIncremented = false
				} else {
					console.warn(`Cannot get a media url of song ${nextItem.song.id}`)
					next()
				}
			})
			.catch((err) => {
				console.error(err)

				message.error(err.message)
			})

		return true
	}

	const prev = () => {
		const prevSong = playedSongs.pop()

		if (!prevSong) {
			message.info("No songs found in the current sessions playback history")

			return
		}

		prevSong
			.getMediaURL()
			.then((songMediaUrls) => {
				dispatch(setSong(prevSong))

				const mediaUrl = pickMediaUrl(songMediaUrls)

				if (mediaUrl) {
					primaryDeck.src = mediaUrl
					primaryDeck.play()

					playCountIncremented = false
				} else {
					console.warn(`Cannot get a media url of song ${prevSong.id}`)
				}
			})
			.catch((err) => {
				console.error(err)

				message.error(err.message)
			})
	}

	const setSongQueue = (items: ISongQueueItem[]) => {
		songQueue.splice(0, songQueue.length)
		items.forEach((item) => songQueue.push(item))
		dispatch(updateSongQueue(songQueue))
	}

	const changeSong = (newSong: IBaseSongPlayable) => {
		songQueue.unshift(makeSongQueueItem(newSong))
		next()
	}

	const enqueueSong = (song: IBaseSongPlayable) => {
		songQueue.push(makeSongQueueItem(song))
		dispatch(updateSongQueue(songQueue))
	}

	const enqueueSongs = (songs: IBaseSongPlayable[]) => {
		songs.forEach((song) => songQueue.push(makeSongQueueItem(song)))
		dispatch(updateSongQueue(songQueue))
	}

	const enqueueSongNext = (song: IBaseSongPlayable) => {
		songQueue.unshift(makeSongQueueItem(song))
		dispatch(updateSongQueue(songQueue))
	}

	const clearQueue = () => {
		songQueue.splice(0, songQueue.length)
		dispatch(updateSongQueue(songQueue))
	}

	const destroy = () => {
		try {
			primaryDeck.parentElement?.removeChild(primaryDeck)
			bufferingDeck.parentElement?.removeChild(bufferingDeck)
		} catch (err) {
			console.log(err)
		}
	}

	primaryDeck.addEventListener("ended", () => {
		const isNextSong = next()

		dispatch(setSong(null))
		dispatch(setSongDuration(0))
		dispatch(setProgress(0))

		if (!isNextSong) {
			dispatch(setPaused())
		}
	})
	primaryDeck.addEventListener("play", () => {
		dispatch(setPlaying())
	})
	primaryDeck.addEventListener("pause", () => {
		dispatch(setPaused())
	})
	primaryDeck.addEventListener("timeupdate", () => {
		const progress = primaryDeck.currentTime / primaryDeck.duration

		dispatch(setProgress(progress))

		if (!playCountIncremented && progress >= 0.7 && currentSong) {
			playCountIncremented = true

			currentSong.incrementSongPlayCount().catch(console.error)
		}
	})
	primaryDeck.addEventListener("durationchange", () => {
		const { currentTime, duration } = primaryDeck
		const progress = currentTime / duration

		dispatch(setSongDuration(duration))
		dispatch(setProgress(progress))
	})

	const checkPrebufferingNextSong = () => {
		const currentProgress = getPlaybackProgress(primaryDeck)

		if (primaryDeck.paused || currentProgress < 0) return

		if (currentProgress >= 0.9 && songQueue.length > 0 && !isBufferingNextSong) {
			const nextItem = songQueue[0]
			isBufferingNextSong = true
			console.log("Start buffering next song")

			nextItem.song
				.getMediaURL()
				.then((songMediaUrls) => {
					const mediaUrl = pickMediaUrl(songMediaUrls)

					if (mediaUrl) {
						bufferingDeck.src = mediaUrl
					} else {
						console.warn(`Cannot get a media url of song ${nextItem.song.id}`)
					}
				})
				.catch((err) => {
					console.error(err)

					message.error(err.message)
				})
		}
	}

	let lastBufferingProgress = -1

	const readAndDispatchBufferingProgress = () => {
		if (primaryDeck.buffered.length === 0) return

		const bufferingProgress = primaryDeck.buffered.end(0) / primaryDeck.duration

		if (Math.abs(lastBufferingProgress - bufferingProgress) > 0.01) {
			lastBufferingProgress = bufferingProgress
			dispatch(setBufferingProgress(bufferingProgress))
		}
	}

	setInterval(() => {
		checkPrebufferingNextSong()
		readAndDispatchBufferingProgress()
	}, 500)

	return {
		play,
		pause,
		changeVolume,
		next,
		prev,
		changeSong,
		setSongQueue,
		enqueueSong,
		enqueueSongs,
		enqueueSongNext,
		subscribeEvents,
		unsubscribeEvents,
		seek,
		clearQueue,
		destroy,
	}
}
