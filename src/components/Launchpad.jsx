import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Twitter, Linkedin, Github, Mail, Copy } from 'lucide-react'
import exampleImage from "../assets/example1.png"
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, getMintLen, TOKEN_2022_PROGRAM_ID, TYPE_SIZE, LENGTH_SIZE, ExtensionType, createInitializeMintInstruction, createInitializeMetadataPointerInstruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, createMintToInstruction, createMintToCheckedInstruction } from '@solana/spl-token'
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { useRecoilState } from 'recoil';
import { netState } from '../atoms/netState';

export default function Launchpad() {
  const [tokenMintAdress, setTokenMintAdress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mintKeypair, setMintKeypair] = useState(null)
  const [token, setToken] = useState({
    name: "",
    symbol: "",
    supply: 0,
    url: "",
  })
  const [isMainnet, setIsMainnet] = useState(true)
  const alertRef = useRef(null)
  const [networkState, setNetworkState] = useRecoilState(netState)
  const wallet = useWallet()
  const { connection } = useConnection()

  const switchNetwork = () => {
    // Toggle network between devnet and mainnet
    const newNetwork = networkState.network === 'devnet' ? 'mainnet' : 'devnet';
    const newUrl = newNetwork === 'devnet'
      ? 'https://solana-devnet.g.alchemy.com/v2/dYmat9Fu20aQ5BnaE3TwD5rD4Q2aMftM'
      : 'https://solana-mainnet.g.alchemy.com/v2/dYmat9Fu20aQ5BnaE3TwD5rD4Q2aMftM'; // Replace with your mainnet API key

    setIsMainnet(!isMainnet)
    setNetworkState({ url: newUrl, network: newNetwork });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!wallet) {
        toast.error("Please connect your wallet.", { duration: 2000 })
        return
    }
    if (wallet.connected === false) {
      toast.error("Please connect your wallet.", { duration: 2000 })
      return
    }
    if (!token.name || !token.symbol || !token.supply || !token.url) {
      toast.error("Please fill out all fields.", { duration: 2000 })
      return
    }
    try {
      alertRef.current.click()
      setIsLoading(true)
      const mintPair = Keypair.generate();
      setMintKeypair(mintPair)
      const metadata = {
        mint: mintKeypair.publicKey,
        name: `${token.name}`,
        symbol: `${token.symbol}`,
        uri: `${token.url}`,
        additionalMetadata: [],
      };
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

      const transaction = new Transaction().add(
          SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
          createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
          createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
          createInitializeInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              mint: mintKeypair.publicKey,
              metadata: mintKeypair.publicKey,
              name: metadata.name,
              symbol: metadata.symbol,
              uri: metadata.uri,
              mintAuthority: wallet.publicKey,
              updateAuthority: wallet.publicKey,
          }),
      );
          
      transaction.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.partialSign(mintKeypair);

      await wallet.sendTransaction(transaction, connection);

      await handleSupply();
      handleDetailsDoc(mintKeypair.publicKey)
      setIsLoading(false)
      toast.success("Token created successfully.", { duration: 2000 })
      return
    } catch (error) {
      setIsLoading(false)
      console.error(error)
      toast.error("An error occurred or you canceled token creation.", { duration: 2000 })
      return
    }
  }

  const handleMoreSupply = async () => {
    setIsLoading(true)
    if (mintKeypair && token){
      const associatedToken = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
      );
      const transaction3 = new Transaction().add(
          createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, token.supply*1000000000, [], TOKEN_2022_PROGRAM_ID)
      );
      
      await wallet.sendTransaction(transaction3, connection);
      setIsLoading(false)
      return
    }
    else {
      toast.error("Create a Token First.")
      return
    }
  }

  const handleSupply = async () => {
      if (mintKeypair && token){
        const associatedToken = getAssociatedTokenAddressSync(
          mintKeypair.publicKey,
          wallet.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
        );
  
        const transaction2 = new Transaction().add(
          createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              associatedToken,
              wallet.publicKey,
              mintKeypair.publicKey,
              TOKEN_2022_PROGRAM_ID,
            ),
        );
        await wallet.sendTransaction(transaction2, connection);
        
        
        const transaction3 = new Transaction().add(
            createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, token.supply*1000000000, [], TOKEN_2022_PROGRAM_ID)
        );
        await wallet.sendTransaction(transaction3, connection);
        return
      }
      else {
        toast.error("Create a Token First")
        return
      }
  }

  const handleDetailsDoc = async (mintKey) => {
    const textContent = `
      Token Name: ${token.name}
      Token Symbol: ${token.symbol}
      Token Supply: ${token.supply}
      Token Address: ${mintKey.toString()}
    `;

    // Downloads the text file with token details
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    link.download = 'tokenDetails.txt';  
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTokenMintAdress(mintKey.toString())
    // Opens the Solana Explorer with the mint address for the newly created token
    const link2 = document.createElement('a');
    link2.href = `https://explorer.solana.com/address/${mintKey.toString()}?cluster=devnet`
    link2.style.display = 'none';
    link2.target = '_blank';
    document.body.appendChild(link2);
    link2.click();
    document.body.removeChild(link2);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <main className="flex-grow relative z-10">
        <div className="container mx-auto px-12 py-12">
          <h1 className="text-6xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 pb-2">
            Solana Token Launchpad
          </h1>

          <div className="flex justify-end mb-6">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${isMainnet ? 'text-gray-400' : 'text-white'}`}>Devnet</span>
              <Switch
                checked={isMainnet}
                onCheckedChange={switchNetwork} 
                className={``}
              >
              </Switch>
              <span className={`text-sm ${isMainnet ? 'text-white' : 'text-gray-400'}`}>Mainnet</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-12">
            {/* Form Section */}
            <div className="md:w-1/2">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input 
                  onChange={
                    (e) => setToken({ ...token, name: e.target.value })
                  } 
                  id="name" 
                  placeholder="Token Name" 
                  className="bg-white text-black border-white focus:ring-white" />
                </div>
                <div>
                  <Label htmlFor="symbol" className="text-white">Symbol</Label>
                  <Input 
                  onChange={
                    (e) => setToken({ ...token, symbol: e.target.value })
                  }
                  id="symbol" 
                  placeholder="Token Symbol" 
                  className="bg-white text-black border-white focus:ring-white" />
                </div>
                <div>
                  <Label htmlFor="supply" className="text-white">Supply</Label>
                  <Input 
                  onChange={
                    (e) => setToken({ ...token, supply: e.target.value })
                  }
                  id="supply" 
                  type="number" 
                  placeholder="Total Supply" 
                  className="bg-white text-black border-white focus:ring-white" />
                </div>
                <div>
                  <Label htmlFor="url" className="text-white">URL</Label>
                  <Input 
                  onChange={
                    (e) => setToken({ ...token, url: e.target.value })
                  }
                  id="url" 
                  placeholder="Metadata URL" 
                  className="bg-white text-black border-white focus:ring-white" />
                </div>
                {/* make responsive */}
                <div className='md:flex-row md:flex-col lg:items-center lg:flex-row sm:flex-col flex flex-col'>
                    <Button type="submit" 
                    className="md:w-[100%] lg:w-[175px] h-[48px] text-[16px] pt-0 pb-0 ps-[24px] pe-[24px] bg-white text-black hover:bg-black hover:text-white border-2 border-white transition-colors sm:w-full">
                    Create Token
                    </Button>
                    <div className='lg:me-4 mt-4 sm:mt-4 md:mt-4'/>
                    <WalletMultiButton />
                    <div className='lg:me-4 mt-4 sm:mt-4 md:mt-4'/>
                    <WalletDisconnectButton />
                </div>
              </form>

              {/* Loading Buffer */}
              {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white text-black p-6 rounded-lg max-w-md text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-lg font-semibold">Please wait for a few seconds, token is being created.</p>
                    <p className="mt-2">You will be prompted to approve some transactions by your wallet in 4-5 seconds, approve them to create your token and mint them to your wallet (this is by default by me, will create a feature to mint them to somebody else).</p>
                    <p className='mt-2 font-semibold'>Click deny/cancel in your wallet prompts to stop.</p>
                  </div>
                </div>
              )}
            </div>

            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button ref={alertRef} variant="outline" className="hidden">Show Dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-black text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription 
                className="text-weight-800">
                  Make sure you have added the name, symbol and supply value right.
                  Deny the connection/transaction request your wallet will show to stop the process any time.
                </AlertDialogDescription>
                <br />
                <AlertDialogDescription 
                className="text-weight-800">
                  If you intend to play around with token put something like 100,000 as supply value.
                </AlertDialogDescription>
                <br />
                <AlertDialogDescription 
                className="text-weight-800">
                  Note - Token will be created on the devent so switch to it inside your wallet's settings for solana.
                  Get atleast 1 devent SOL using the faucet(it's mine) link in the info part.
                </AlertDialogDescription>
                <br />
                <AlertDialogDescription 
                className="text-weight-800">
                  This is for testing purposes only and if the site was set to mainnet you would have to pay for the transaction fees in actual SOL.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

            {/* Info Section */}
            <div className="md:w-1/2">
              <h2 className="text-2xl font-semibold mb-4">About Token Launchpad</h2>
              <p className="mt-4 text-sm text-gray-400">
                Current network: <span className="font-semibold">{isMainnet ? 'Mainnet' : 'Devnet'}</span>
              </p>
              <p className='mt-4'>
                I just launched my own token $MCAT on devent and realised it's so difficult for a begineer, hence why this site exists.
                Remember if you switch to mainnet you will need to pay for the transaction fees in actual SOL.
              </p>
              <p className='mt-4'>
                Click the link below to airdrop some devent SOL to your wallet if you don't have any.
              </p>
              <a href="https://solana-faucet-three.vercel.app/" target="_blank" className='text-white underline mt-4'>Get Devnet SOL</a>
              <img src={exampleImage} alt="Token Example" className='w-[400px] h-[210px] object-fit mt-4'/>
              <p className='mt-4'>
                You need to host a metadata.json file for your token, you can use https://moggingcat-token.s3.amazonaws.com/metadata.json to test the launchepad
              </p>
              <p className='mt-4'>
                Switch to devnet in your wallet. If it asks for an endpoint put this in - https://api.devnet.solana.com.
              </p>
              <p className='mt-4'>
                The site will auto download a file with the token details and redirect you to the solana explorer to view your token, unless popups are blocked then click the link below (it will appear once token is created).
              </p>
              {
                tokenMintAdress && <a href={`https://explorer.solana.com/address/${tokenMintAdress}?cluster=devnet`} target="_blank" className='text-white underline mt-4'>View Token</a>
              }
              <p className="mt-4">
                You need a wallet like Phantom or Backpack to use this website since it needs to partially sign the transactions and it's not optimal to ask for your private key and you wouldn't give it either if I did.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl font-medium">What is a token?</AccordionTrigger>
                <AccordionContent>
                  A token is a digital asset that represents value or utility on a blockchain network.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xl font-medium">How do I create a token?</AccordionTrigger>
                <AccordionContent>
                  Fill out the form with your token's details and click the "Create Token" button. Our platform will guide you through the rest of the process.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-xl font-medium">Is technical knowledge required?</AccordionTrigger>
                <AccordionContent>
                  No, our user-friendly interface is designed for both technical and non-technical users.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6">
        <div className="container mx-auto px-12 flex flex-col sm:flex-row justify-between items-center">
          <p className="mb-4 sm:mb-0">Designed And Developed By Arav Bhivgade</p>
          <div className="flex space-x-6">
            <a href="https://x.com/arav190720" className="hover:text-gray-300 transition-all duration-200 ease-in-out transform hover:scale-110">
              <Twitter size={24} />
            </a>
            <a href="https://www.linkedin.com/in/aravbhivgade" className="hover:text-gray-300 transition-all duration-200 ease-in-out transform hover:scale-110">
              <Linkedin size={24} />
            </a>
            <a href="https://github.com/bhivgadearav" className="hover:text-gray-300 transition-all duration-200 ease-in-out transform hover:scale-110">
              <Github size={24} />
            </a>
            <a href="mailto:bhivgadearav0@gmail.com" className="hover:text-gray-300 transition-all duration-200 ease-in-out transform hover:scale-110">
              <Mail size={24} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}