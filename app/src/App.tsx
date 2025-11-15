import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import Transaction from './components/Transaction';

const App = () => {
  const [userAddress, setUserAddress] = useState(null);

  const handleWalletConnect = (address) => {
    setUserAddress(address);
  };

  return (
    <div>
      <h1>Solana Escrow DApp</h1>
      <WalletConnect onConnect={handleWalletConnect} />
      {userAddress && <Transaction userAddress={userAddress} />}
    </div>
  );
};

export default App;