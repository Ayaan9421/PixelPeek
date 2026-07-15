const ALPHABET = 'ABCDEFGHIJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

function generateCode() {
        let code = ''
        for (let i = 0; i < CODE_LENGTH; i++) {
                code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
        }
        return code
}

export function generateUniqueRoomCode(existsFn) {
        let code = generateCode()
        let attempts = 0
        while (existsFn(code) && attempts < 20) {
                code = generateCode()
                attempts++
        }
        return code
}

