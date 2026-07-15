export function createPlayer({ uuid, name, socketId, isHost = false }) {
        return {
                uuid,
                name,
                socketId,
                isHost,
                score: 0,
                connected: true,
                disconnectedAt: null,
        }
}

export function createRoomState({ code, hostUuid, settings }) {
        return {
                code,
                hostUuid,
                settings,
                status: 'lobby', // lobby, playing, ended
                players: new Map(),
                currentRound: 0,
                pickerUuid: null,
                pickerOrder: [],
                currentPickerIndex: -1,
                roundPhase: null,
                roundDeadline: null,
                currentImage: null,
                createdAt: Date.now(),
        }
}

export function serializeRoom(room) {
        return {
                code: room.code,
                hostUuid: room.hostUuid,
                settings: room.settings,
                status: room.status,
                currentRound: room.currentRound,
                playersPerRound: room.pickerOrder.length,
                turnNumberInRound: room.currentPickerIndex + 1,
                pickerUuid: room.pickerUuid,
                roundPhase: room.roundPhase,
                roundDeadline: room.roundDeadline,
                currentImage: room.currentImage ? {
                        token: room.currentImage.token,
                        crop: room.currentImage.crop,
                        naturalWidth: room.currentImage.naturalWidth,
                        naturalHeight: room.currentImage.naturalHeight,
                } : null,
                players: Array.from(room.players.values()).map(serializePlayer),
        }
}

export function serializePlayer(player) {
        return {
                uuid: player.uuid,
                name: player.name,
                isHost: player.isHost,
                score: player.score,
                connected: player.connected
        }
}

