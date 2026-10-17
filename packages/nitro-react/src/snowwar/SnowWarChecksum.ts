const CHECKSUM_SEED = 0x534e4f57;

const rotateLeft = (value: number, bits: number): number => (value << bits) | (value >>> (32 - bits));

export class SnowWarChecksumBuilder {
    private hash = CHECKSUM_SEED | 0;
    private count = 0;

    public add(word: number): void {
        let mixed = Math.imul(word | 0, 0xcc9e2d51);

        mixed = rotateLeft(mixed, 15);
        mixed = Math.imul(mixed, 0x1b873593);
        this.hash ^= mixed;
        this.hash = rotateLeft(this.hash, 13);
        this.hash = (Math.imul(this.hash, 5) + 0xe6546b64) | 0;
        this.count++;
    }

    public finish(): number {
        let hash = this.hash ^ this.count;

        hash ^= hash >>> 16;
        hash = Math.imul(hash, 0x85ebca6b);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0xc2b2ae35);
        hash ^= hash >>> 16;

        return hash | 0;
    }
}
