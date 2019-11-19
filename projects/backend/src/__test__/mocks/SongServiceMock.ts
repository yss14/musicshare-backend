import { ISongService } from "../../services/SongService";
import { Song } from "../../models/SongModel";
import { v4 as uuid } from 'uuid';
import { Share } from "../../models/ShareModel";
import { SongSearchMatcher } from "../../inputs/SongSearchInput";

export class SongServiceMock implements ISongService {
	public async getByID(): Promise<Song> {
		throw 'Not implemented yet';
	}

	public async getByShare(shareID: string): Promise<Song[]> {
		throw 'Not implemented yet';
	}

	public async getSongOriginLibrary(songID: string): Promise<Share | null> {
		throw 'Not implemented yet';
	}

	public async hasAccessToSongs(userID: string, songIDs: string[]): Promise<boolean> {
		throw 'Not implemented yet';
	}

	public async getByShareDirty(shareID: string, lastTimestamp: number): Promise<Song[]> {
		throw 'Not implemented yet';
	}

	public async create(): Promise<string> {
		return uuid();
	}

	public async update() {
		throw 'Not implemented yet';
	}

	public async searchSongs(userID: string, query: string, matcher: SongSearchMatcher[]): Promise<Song[]> {
		throw 'Not implemented yet';
	}

	public async removeSong(libraryID: string, songID: string): Promise<void> {
		throw 'Not implemented yet';
	}
}