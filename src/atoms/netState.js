import { atom } from 'recoil';

export const netState = atom({
    key: 'netState',
    default: {
        network: "devnet",
        url: "https://solana-devnet.g.alchemy.com/v2/dYmat9Fu20aQ5BnaE3TwD5rD4Q2aMftM",
    }
});