import { CROP_EXPANSION } from '../config/gameDefaults.js'

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
                currentAnswer: null,
                chatState: createChatState(),
                // Accumulates { token, answer, pickerName } for each completed round.
                // Sent to clients only on game-ended so it doesn't bloat mid-game syncs.
                roundGallery: [],
                // Each entry: { charIndex: number, letter: string }
                // charIndex is a flat index into the full answer string (spaces included).
                // Client can use answerPattern to reconstruct word/letter positions.
                revealedHints: [],
        }
}

export function createChatState() {
        return {
                correctGuessers: new Set(),
                roundScores: {}, // { [uuid]: { name, pts, isPicker? } }
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
                        expansionsUsed: room.currentImage.expansionsUsed || 0,
                        maxExpansions: CROP_EXPANSION.maxExpansions,
                        expansionCheckpoints: CROP_EXPANSION.checkpoints,
                } : null,
                // Never send room.currentAnswer itself to the client. Everyone (including
                // the picker's own client) only gets the per-word letter-count pattern so
                // HintBar can render "_ _ _  _ _ _ _" without leaking the answer.
                answerPattern: room.currentAnswer
                        ? room.currentAnswer.trim().split(/\s+/).map((word) => word.length)
                        : null,
                // Flat-index + letter pairs for each hint revealed so far this round.
                // A reconnecting client gets the full list and can replay all reveals.
                revealedHints: room.revealedHints ?? [],
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