import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import Launchpad from './components/Launchpad';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { netState } from './atoms/netState';


export default function App() {
  const [networkState, setNetworkState] = useRecoilState(netState);
  return (
    <div>
      <ConnectionProvider endpoint={networkState.url}>
        <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Launchpad />} />
                  <Route path="*" element={<Launchpad />} />
                </Routes>
              </BrowserRouter>
            </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  )
}
