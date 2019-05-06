import { Scopes } from "../../types/context";
import { ArgsDictionary } from "type-graphql";
import { Share } from "../../models/ShareModel";
import { Playlist } from "../../models/PlaylistModel";

export const hasAllPermissions = (requiredPermissions: string[], currentPermissions: string[]) => {
	return !requiredPermissions.some(requiredPermission => !currentPermissions.includes(requiredPermission));
}

export const getRequiredPermissionsForShare = (shareID: string, scopes: Scopes) => {
	const shareScopes = scopes.find(scope => scope.shareID === shareID);

	if (!shareScopes) {
		throw new Error(`No scopes provided for share ${shareID}`);
	}

	return shareScopes.permissions;
}

export const getShareIDFromRequest = ({ args, root }: { args: ArgsDictionary, root: any }) => {
	if (root instanceof Share) {
		return root.id;
	}

	if (typeof args.shareID === 'string') {
		return args.shareID;
	}

	return null;
}

export const getPlaylistIDFromRequest = ({ args, root }: { args: ArgsDictionary, root: any }) => {
	if (root instanceof Playlist) {
		return root.id;
	}

	if (typeof args.playlistID === 'string') {
		return args.playlistID;
	}

	return null;
}