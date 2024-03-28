import {WsProvider, ApiPromise} from '@polkadot/api'
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp'
import { InjectedAccountWithMeta, InjectedExtension, } from '@polkadot/extension-inject/types'
import {useEffect, useState } from 'react'
import logo from './assets/images/logo2.png'
import interlay from './assets/images/inetrlay.png'
import kintsugi from './assets/images/kintsugi.svg'
import ajuna from './assets/images/ajuna.png'
import transactionStepsData from './assets/data/transactionSteps'


import './App.css'
import { ArrowRightOutlined, DeploymentUnitOutlined, AppstoreAddOutlined , CreditCardOutlined, ApiOutlined, DollarOutlined, SwapOutlined, SecurityScanOutlined, LoadingOutlined, QuestionCircleOutlined, CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons'
import { Button, Col, Image, Row, Steps, Card, Avatar, Select, Modal, Form, Input, Spin, Tooltip, List } from 'antd'
const { Meta } = Card

const NAME = "AHSTEST"

const RPCs: { [key: number]: string } = {
  0: 'wss://api-testnet.interlay.io:443/parachain',
  1: 'wss://api-dev-kintsugi.interlay.io:443/parachain',
  2: 'wss://api-dev-kintsugi.interlay.io:443/parachain'
}

const WalletData = [
  {
    title: 'Talisman',
    link: 'https://www.talisman.xyz/',
    icon: 'Talisman.jpeg'
  },
  {
    title: 'Nova',
    link: 'https://novawallet.io/',
    icon: 'Nova.jpg'
  },
  {
    title: 'Polkadot.js',
    link: 'https://polkadot.js.org/extension/',
    icon: 'Polkadot.js.svg'
  },
];

const delay = (ms: number) => {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

const App = () => {
  const [isWalletInstalled, setIsWalletInstalled] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRPCId, setSelectedRPCId] = useState<number>(1000)
  const [connectedWallet, setConnectedWallet] = useState<InjectedExtension[]>()
  const [selectedAddress, setSelectedAddress] = useState<any>("choose")
  const [errorNoNext, setErrorNoNext] = useState('')

  const [api, setApi] = useState<ApiPromise>()
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta>()
  
  // Available Assets (filled when parachain is choosen)
  const [availableAssets, setAvailableAssets] = useState<any>({})
  // Balances
  const [userTokenBalances, setUserTokenBalances] = useState<any[]>([])
  const [userForeignAssetBalances, setUserForeignAssetBalances] = useState<any[]>([])
  
  // Send token
  const [tokenToSend, setTokenToSend] = useState<any>('choose')
  const [isToken, setIsToken] = useState(true)
  const [isFeeWithToken, setIsFeeWithToken] = useState(true)
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<any>()
  const [estimatedFee, setEstimatedFee] = useState<any>()
  const [tokenToPayFees, setTokenToPayFees] = useState<any>('INTR')
  const [amountToSend, setAmountToSend] = useState(0)
  const [addressToSend, setAddressToSend] = useState('')
  // Transaction
  const [currentTransactionStep, setCurrentTransactionStep] = useState<number>()
  const [transactionResult, setTransactionResult] = useState<any>({})
  const [transactionSuccess, setTransactionSuccess] = useState(-10)
  const [blcokNumber, setBlockNumber] = useState<number>()
  const [blockHash, setBlockHash] = useState('')
  // MODAL Definitions
  const [modalBalance, setModalBalance] = useState(false)
  const [modalTransfer, setModalTransfer] = useState(false)

  const setup = async () => {
    const wsProvider = new WsProvider(RPCs[selectedRPCId])
    const api = await ApiPromise.create({provider: wsProvider})
    setApi(api)
  }

  useEffect(()=>{
    if (currentStep===3){
      setup()
    }
  }, [currentStep])

  useEffect(()=>{
    if (!api) return

    (async () => {
      const availableAssets = await api.rpc.system.properties()
      setAvailableAssets(availableAssets.toPrimitive())
    })()

  }, [api])

  const handleConnection = async () => {
    await web3Enable(NAME)
          .then(data=>{
            console.log(data)
            if (data.length>0){
              setConnectedWallet(data)
            }else{
              console.log("There is no wallet extensions installed.")
              setIsWalletInstalled(false)
              setErrorNoNext("No Wallet Installed.")
            }
          })
          .catch(error=>console.log(error))

    const allAccounts = await web3Accounts()
    console.log(allAccounts)

    setAccounts(allAccounts)
    
    if (allAccounts.length===1){
      setSelectedAccount(allAccounts[0])
    }

  }

  const handleAccountSelection = async (value: string) => {
    setSelectedAddress(value)
  }

  const handleAddressValidation = async () => {
    if (!api) return
    await api.query.tokens.accounts(selectedAccount?.address, {Token: 'IBTC'})
      .then(()=>{setErrorNoNext('success')})
      .catch(()=>{setErrorNoNext('Address is not valid for this parachain. Please choose another account!')})
  }

  useEffect(()=>{
    if (selectedAddress!=="choose"){
      const account = accounts.find(account => account.address===selectedAddress)
      if (!account){
        throw Error("NO_ACCOUNT_FOUND")
      }
      setSelectedAccount(account)
    }
  },[selectedAddress])

  useEffect(()=>{
    if (selectedAccount){
      handleAddressValidation()
    }
  }, [selectedAccount])

  const handleGetBalances = async () => {
    if (!api) return
    // Get all the available foreign assets:
    try {
      const foreignAssets = await api.query.assetRegistry.metadata.entries()
      let _foreignAssets:any[] = []
      foreignAssets.forEach(async ([key, value]) => {
        const assetId = key.args[0].toString()
        const assetInfo = await api.query.tokens.accounts(selectedAccount?.address, {ForeignAsset: assetId})
        const assetInfoJSON:any = assetInfo.toJSON()
        const metadata:any = value.toHuman()
        metadata["free"] = assetInfoJSON?.free
        metadata["reserved"] = assetInfoJSON?.reserved
        metadata["frozen"] = assetInfoJSON?.frozen
        metadata["assetId"] = assetId
        _foreignAssets.push(metadata)
      });
      setUserForeignAssetBalances(_foreignAssets)
      let index = 0
      const balancesPromises = availableAssets?.tokenSymbol.map(async (token: string) => {
        const data:any = await api.query.tokens.accounts(selectedAccount?.address, { Token: token })
        const tokenBalance = { 'token': token, 'decimals': availableAssets.tokenDecimals[index], ...data.toPrimitive() }
        index+=1
        return tokenBalance
      })
  
      const balances = await Promise.all(balancesPromises || [])
      setUserTokenBalances([...balances])
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  const handleEstimateFees = async () => {
    const SENDER = '' + selectedAccount?.address.toString()
    const injector = await web3FromAddress(SENDER)
    const amountToSendMain = amountToSend * Math.pow(10,selectedTokenBalance.decimals)
    if (isToken){
      if (isFeeWithToken){
        const info = await api?.tx.tokens.transfer(addressToSend, { Token: tokenToSend }, amountToSendMain)
                      .paymentInfo(SENDER, { signer: injector.signer })
        console.log(`
          class=${info?.class.toString()},
          weight=${info?.weight.toString()},
          partialFee=${info?.partialFee.toHuman()}
        `);
        console.log()
        setEstimatedFee(info?.partialFee.toHuman())
        
      }else{
        const info = await api?.tx.multiTransactionPayment.withFeeSwapPath(
          [
            {ForeignAsset: parseInt(tokenToPayFees)}, // paying with USDT
            {Token: 'INTR'} // swapping to INTR
          ],
          1, // max amount of USDT to swap
          // transferring DOT on Interlay and paying tx fees in USDT
          api.tx.tokens.transfer(addressToSend, {Token: tokenToSend}, amountToSendMain)
        ).paymentInfo(SENDER, { signer: injector.signer })
        console.log(`
          class=${info?.class.toString()},
          weight=${info?.weight.toString()},
          partialFee=${info?.partialFee.toHuman()}
        `);
        setEstimatedFee(info?.partialFee.toHuman())
      }

    }else{
      if (isFeeWithToken){
        const info = await api?.tx.tokens.transfer(addressToSend, { ForeignAsset: tokenToSend }, amountToSendMain)
                      .paymentInfo(SENDER, { signer: injector.signer })
        console.log(`
          class=${info?.class.toString()},
          weight=${info?.weight.toString()},
          partialFee=${info?.partialFee.toHuman()}
        `);
  
        setEstimatedFee(info?.partialFee.toHuman())
      }else{
        const info = await api?.tx.multiTransactionPayment.withFeeSwapPath(
          [
            {ForeignAsset: parseInt(tokenToPayFees)}, // paying with USDT
            {Token: 'INTR'} // swapping to INTR
          ],
          1, // max amount of USDT to swap
          // transferring DOT on Interlay and paying tx fees in USDT
          api.tx.tokens.transfer(addressToSend, { ForeignAsset: tokenToSend }, amountToSendMain)
        ).paymentInfo(SENDER, { signer: injector.signer })
        console.log(`
          class=${info?.class.toString()},
          weight=${info?.weight.toString()},
          partialFee=${info?.partialFee.toHuman()}
        `);
        setEstimatedFee(info?.partialFee.toHuman())
      }
    }
  }

  const handleTransfer = async () => {
    setTransactionSuccess(0)
    setCurrentTransactionStep(0)
    const SENDER = '' + selectedAccount?.address.toString()
    const injector = await web3FromAddress(SENDER)
    const amountToSendMain = amountToSend * Math.pow(10,selectedTokenBalance.decimals)

    // Pay fees with another token (OK!) -> Transfer funds thorugh tokens or foreign assets
    // if (isToken && is){}
    // api?.tx.multiTransactionPayment.withFeeSwapPath(
    //   [
    //     {ForeignAsset: 2}, // paying with USDT
    //     {Token: 'INTR'} // swapping to INTR
    //   ],
    //   412, // amount of USDT to swap
    //    // transferring DOT on Interlay and paying tx fees in USDT
    //   api.tx.tokens.transfer(addressToSend, {Token: tokenToSend}, amountToSendMain)
    // ).signAndSend(SENDER, { signer: injector.signer })

    // Guess the Fee when another token is used (It needs to access the pools for getting the swapping rate!)

    if (isToken){
      if(isFeeWithToken){
        await api?.tx.tokens.transfer(addressToSend, { Token: tokenToSend }, amountToSendMain)
                      .signAndSend(SENDER, { signer: injector.signer }, (result:any)=>{setTransactionResult(result.toHuman())}).catch(()=>{setCurrentTransactionStep(1001); setTransactionSuccess(-10)})
      }else{
        await api?.tx.multiTransactionPayment.withFeeSwapPath(
          [
            {ForeignAsset: parseInt(tokenToPayFees)}, // paying with USDT
            {Token: 'INTR'} // swapping to INTR
          ],
          412, // max amount of USDT to swap
          // transferring DOT on Interlay and paying tx fees in USDT
          api.tx.tokens.transfer(addressToSend, { Token: tokenToSend }, amountToSendMain)
        ).signAndSend(SENDER, { signer: injector.signer }, (result:any)=>{setTransactionResult(result.toHuman())}).catch(()=>{setCurrentTransactionStep(1001); setTransactionSuccess(-10)})
      }
    }else{
      if (isFeeWithToken){
        await api?.tx.tokens.transfer(addressToSend, { ForeignAsset: tokenToSend }, amountToSendMain)
                      .signAndSend(SENDER, { signer: injector.signer }, (result:any)=>{setTransactionResult(result.toHuman())}).catch(()=>{setCurrentTransactionStep(1001); setTransactionSuccess(-10)})
      }else{
        await api?.tx.multiTransactionPayment.withFeeSwapPath(
          [
            {ForeignAsset: parseInt(tokenToPayFees)}, // paying with USDT
            {Token: 'INTR'} // swapping to INTR
          ],
          412, // max amount of USDT to swap
          // transferring DOT on Interlay and paying tx fees in USDT
          api.tx.tokens.transfer(addressToSend, { ForeignAsset: tokenToSend}, amountToSendMain)
        ).signAndSend(SENDER, { signer: injector.signer }, (result:any)=>{setTransactionResult(result.toHuman())}).catch(()=>{setCurrentTransactionStep(1001); setTransactionSuccess(-10)})
      }
    }

  }
  const handleTransactionStatus = async () => {
    console.log(transactionResult)
    if (transactionResult?.status && transactionResult?.status!=="Ready"){
      if (Object.keys(transactionResult?.status)[0] === "Broadcast"){
        setCurrentTransactionStep(1)
      }
      if (Object.keys(transactionResult?.status)[0] === "InBlock"){
        if (!api) return
        // const blockHash = await api.rpc.chain.getBlockHash(transactionResult?.status.InBlock);
        const _blockHash = transactionResult?.status.InBlock
        const header = await api.rpc.chain.getHeader(_blockHash);
        const _blockNumber = header.number.toNumber();
        setBlockHash(_blockHash)
        setBlockNumber(_blockNumber)
        setCurrentTransactionStep(2)
        await delay(1500)
      }
      if (transactionResult.events.length === 4){
        if (transactionResult.events[3]?.event?.method === "ExtrinsicFailed"){
          setTransactionSuccess(-1)
        }
      }
      if (transactionResult.events.length === 5){
        if (transactionResult.events[4]?.event?.method === "ExtrinsicSuccess"){
          // transaction has already been verified as completed?
          if (transactionSuccess!==1){
            setCurrentTransactionStep(3)
            await delay(1500)
            setCurrentTransactionStep(4)
            await delay(1500)
            setCurrentTransactionStep(5)
            setTransactionSuccess(1)
          }
        }
      }
      if (transactionResult.events.length === 8){
        if (transactionResult.events[7]?.event?.method === "ExtrinsicSuccess"){
          if (transactionSuccess!==1){
            setCurrentTransactionStep(3)
            await delay(1500)
            setCurrentTransactionStep(4)
            await delay(1500)
            setCurrentTransactionStep(5)
            setTransactionSuccess(1)
          }
        }
      }
    }
  }

  useEffect(()=>{
    handleTransactionStatus()
  }, [transactionResult])

  useEffect(()=>{
    if (isToken){
      setSelectedTokenBalance(userTokenBalances.filter(userbalance=>userbalance.token===tokenToSend)[0])
    }else{
      setSelectedTokenBalance(userForeignAssetBalances.filter(userbalance=>userbalance.assetId===tokenToSend)[0])
    }
    if (amountToSend){
      handleEstimateFees()
    }
  },[isToken, tokenToSend, tokenToPayFees, amountToSend, isFeeWithToken])

  // STEP 1
  const step1 = 
  <Col span={24}>
    <h2>Welcome to PolkadotJS/Interlay Demo</h2>
    <h3>
      In this demo, user will select the parachain they want to connect. <br/>
      Then, they have the ability to connect a wallet and then select the account they want to use for interactions. <br/>
      For each chain, there are some tools provided. User can explore the tools in the third step. <br/>
      User can create transactions. In this case, a pop-up for approval will be shown from their wallet that they should accept. <br/>
    </h3>
    <h4>Please note: this demo is only using testnet parameters and there is no real value on the tokens sent/received.</h4>
    <br/>
    <h6>Created by Amirhossein Sefati (ahsefati1998@gmail.com)</h6>
  </Col>

  // STEP 2
  interface ChainToSelectProps {
    rpcId: number
    logo: string
    name: string
    description: string
    active: boolean
  }
  const ChainToSelect: React.FC<ChainToSelectProps> = ({rpcId, logo, name, description, active}) => {
    return (
      <Card
        style={{ width: 270 }}
        className={selectedRPCId===rpcId?'itemToSelectSelected':active?'itemToSelect':''}
        onClick={()=>setSelectedRPCId(rpcId)}
      >
        <Meta
          avatar={<Avatar style={{height:'80px', width:'80px'}} src={logo}/>}
          title={
            <h3 style={{margin:0, marginTop:'8px'}}>{name}</h3>
          }
          description={active?description:'Coming Soon!' }
        />
      </Card>
    )
  }

  const step2 = (
    <Row justify={'space-between'}>
      <Col span={6}>
        <ChainToSelect active={true} rpcId={0} logo={interlay} name="Interlay" description="Via Interlay Testnet."/>
      </Col>
      <Col span={6}>
        <ChainToSelect active={false} rpcId={1} logo={kintsugi} name="Kintsugi" description="Via Kintsugi Testnet."/>
      </Col>
      <Col span={6}>
        <ChainToSelect active={false} rpcId={2} logo={ajuna} name="Ajuna" description="Via Ajuna Network."/>
      </Col>
    </Row>
  )

  // STEP 3
  const step3 = 
  <Col span={24}>
    <h4 style={{color:'green'}}>&#9989; Succesfully Connected to the Parachain.</h4>
    <h3>Now, you should connect your wallet:</h3>
    <Button onClick={handleConnection} disabled={isWalletInstalled?false:true} type='primary'>Connect{connectedWallet&&'ed'}{!isWalletInstalled&&'ion Failed!'}</Button>
    {!isWalletInstalled && 
      <>
        <h3>You don't have any installed wallets yet. Please install one from the list below and refresh the page afterwards:</h3>
        <List
          style={{marginBottom:'24px'}}
          itemLayout="horizontal"
          dataSource={WalletData}
          renderItem={(item, _) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={"/src/assets/images/"+item.icon} />}
                title={<a target='_blank' href={item.link}>{item.title}</a>}
                description={item.link}
              />
            </List.Item>
          )}
        />
      </>
    }
    {connectedWallet && <h4 style={{color:'green'}}>&#9989; Connected Wallet: {connectedWallet[0].name.toUpperCase()}</h4>}
    {connectedWallet && <h3>Now, please select your desired account:</h3>}
    {connectedWallet &&
      <Select value={selectedAddress} style={{minWidth:'300px'}} onChange={handleAccountSelection}>
        <option value={"choose"} disabled hidden>Choose your account</option>
        {accounts.map((account)=>(
          <option key={account.address} value={account.address}>{account.address}</option>
        ))}
      </Select>
    }
    {connectedWallet && errorNoNext==='success' && <h4 style={{color:'green'}}>&#9989; Success! Wallet address is valid.</h4>}
  </Col>

  // STEP 4
  interface ToolToSelectProps {
    toolId: number,
    icon: React.ReactNode,
    name: string,
    description: string
  } 
  const ToolToSelect: React.FC<ToolToSelectProps> = ({toolId, icon, name, description}) => {
    return (
      <Card
        className='itemToSelect'
        key={toolId}
        style={{ width: 270 }}
        onClick={()=>{
          if (toolId===0){
            handleGetBalances()
            setModalBalance(true)
          }
          if (toolId===1){
            handleGetBalances()
            setCurrentTransactionStep(1000)
            setModalTransfer(true)
          }
        }}
      >
        <Meta
          avatar={icon}
          title={name}
          description={description}
        />
      </Card>
    )
  }
  const step4 = 
  <Row justify={'space-between'}>
    <Col span={6}>
      <ToolToSelect toolId={0} icon={<DollarOutlined style={{fontSize:'36px'}}/>} name='Check Balance' description='Check the balance associated to the selected account.'/>
    </Col>
    <Col span={6}>
      <ToolToSelect toolId={1} icon={<SwapOutlined style={{fontSize:'36px'}}/>} name='Transfer' description='Send enabled tokens to validated addresses and see the transaction steps.'/>
    </Col>
    <Col span={6}>
      <ToolToSelect toolId={2} icon={<SecurityScanOutlined style={{fontSize:'36px'}}/>} name='Block Explorer' description='View and check the status of each interaction on the network.'/>
    </Col>
  </Row>

  return (
    <>
      <Row justify={'center'} align={'middle'} style={{marginTop:'48px'}}>
        <Col span={16}>
          <Row align={'middle'} justify={'space-between'}>
            <Col span={16}>
              <Image preview={false} src={logo}/>
            </Col>
            <Col>
              <Tooltip title="interlay.io">
                <Button onClick={()=>location.href = 'https://interlay.io'} style={{marginRight:'8px'}} icon={<ArrowRightOutlined rotate={-60} />}>Home</Button>
              </Tooltip>
              <Tooltip title="app.interlay.io">
                <Button onClick={()=>location.href = 'https://app.interlay.io'} style={{marginRight:'8px'}} icon={<ArrowRightOutlined rotate={-60} />}>Platform</Button>
              </Tooltip>
              <Tooltip title="docs.interlay.io">
                <Button onClick={()=>location.href = 'https://docs.interlay.io'} icon={<ArrowRightOutlined rotate={-60} />}>Docs</Button> 
              </Tooltip>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row justify={'center'}>
        <Col span={16}>
          <Row style={{marginTop:'24px'}}>
            <Col span={24}>
              <Steps
                items={[
                  {
                    title: '1. Welcome',
                    status: currentStep===1?'process':'finish',
                    icon: <DeploymentUnitOutlined />,
                  },
                  {
                    title: '2. Connect Parachain',
                    status: currentStep<2 ? 'wait' : currentStep===2 ? 'process' : 'finish',
                    icon: <ApiOutlined />,
                  },
                  {
                    title: '3. Select Wallet',
                    status: currentStep<3 ? 'wait' : currentStep===3 ? 'process' : 'finish',
                    icon: <CreditCardOutlined />,
                  },
                  {
                    title: '4. Explore Tools',
                    status: currentStep<4 ? 'wait' : currentStep===4 ? 'process' : 'finish',
                    icon: <AppstoreAddOutlined />,
                  },
                ]}
              />
            </Col>
          </Row>
          <Row style={{minHeight:'300px', marginTop:'6px'}}>
            {currentStep===1 && step1}
            {currentStep===2 && step2}
            {currentStep===3 && step3}
            {currentStep===4 && step4}
          </Row>
          <Row>
            {currentStep!==1 &&
              <Col span={3}>
                <Button disabled={(errorNoNext==='' || errorNoNext==='success')?false:true} onClick={()=>setCurrentStep(value=>value-1)} type='default' danger>Previous</Button>
              </Col>
            }
            {currentStep!==4 &&
              <Col span={3}>
                <Button disabled={(errorNoNext==='' || errorNoNext==='success')?false:true} onClick={()=>setCurrentStep(value=>value+1)} type='primary'>Next</Button>
              </Col>
            }
          </Row>
          {errorNoNext && errorNoNext!=='success' &&
            <Row>
              <h5 style={{color:'red'}}>&#10060; {errorNoNext}</h5>
            </Row>
          }
        </Col>
      </Row>
      {/* Footer */}
      <Row justify={'center'} style={{marginTop:'36px'}}>
        <Col span={16} style={{backgroundColor:'lightgray', color:'darkgray', padding:'4px', borderBottomLeftRadius:'8px', borderBottomRightRadius:'8px', textAlign:'center'}}>
        © 2024 Coindelta, All Right Reserved.
        </Col>
      </Row>

      {/* MODALS for Tools */}
      {/* Balances Modal */}
      <Modal
        title="Account Balances"
        centered
        open={modalBalance}
        footer={[
          <Button key="back" onClick={() => setModalBalance(false)}>
            OK
          </Button>,
        ]}
        style={{maxWidth:'fit-content'}}
        onOk={() => setModalBalance(false)}
        onCancel={() => setModalBalance(false)}
      >
        {userTokenBalances.length>0 && userForeignAssetBalances.length>0 ?
          <Row justify={'start'} style={{marginTop:'28px'}}>
            {userTokenBalances.map(userBalance=>{
              return(
                <Col key={userBalance.token} className='balanceToHover' style={{marginBottom:'18px'}} span={12}>
                  <Row justify={'space-between'} align={'top'}>
                    <Col span={2}>
                      <Image preview={false} src={"/src/assets/images/"+userBalance.token+".png"} style={{borderRadius:'50%'}} height={'60px'} width={'60px'}/>
                    </Col>
                    <Col span={16} style={{marginLeft:'12px'}}>
                      <h2 style={{marginBottom:'-16px', marginTop:'-5px'}}>{userBalance.token}</h2>
                      <h4>
                          Free: {(Number(userBalance.free)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                          <br/>
                          Reserved: {(Number(userBalance.reserved)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                          <br/>
                          Frozen: {(Number(userBalance.frozen)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                      </h4>
                    </Col>
                  </Row>
                </Col>
              )
            })}
            {
            userForeignAssetBalances.map(userFABalance=>{
              return(
                <Col key={userFABalance.assetId} className='balanceToHover' style={{marginBottom:'18px'}} span={12}>
                  <Row justify={'space-between'} align={'top'}>
                    <Col span={2}>
                      <Image preview={false} src={"/src/assets/images/"+userFABalance.symbol+".png"} style={{borderRadius:'50%'}} height={'60px'} width={'60px'}/>
                    </Col>
                    <Col span={16} style={{marginLeft:'12px'}}>
                      <h2 style={{marginBottom:'-16px', marginTop:'-5px'}}>{userFABalance.symbol}</h2>
                      <h4>
                          Free: {(Number(userFABalance.free)/Math.pow(10,userFABalance.decimals)).toFixed(4) || 0}
                          <br/>
                          Reserved: {(Number(userFABalance.reserved)/Math.pow(10,userFABalance.decimals)).toFixed(4) || 0}
                          <br/>
                          Frozen: {(Number(userFABalance.frozen)/Math.pow(10,userFABalance.decimals)).toFixed(4) || 0}
                      </h4>
                    </Col>
                  </Row>
                </Col>
              )
            })
            }
          </Row>
          :
          <Row justify={'center'} style={{padding:'36px 52px 36px 52px'}}>
            <Spin size='large'/>
          </Row>
        }
      </Modal>

      {/* Transfer Modal */}
      <Modal
        title="Transfer Tokens"
        centered
        open={modalTransfer}
        onOk={() => setModalTransfer(false)}
        onCancel={() => setModalTransfer(false)}
        footer=''
      >
        <Row justify={'space-between'} align={'top'}>
          <Col span={16}>
            <Form.Item label="Destination Address">
              <Input value={addressToSend} onChange={e=>setAddressToSend(e.target.value)} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item label="Select Token to Send">
              <Select 
                value={tokenToSend} 
                onChange={(value)=>{
                  setTokenToSend(value)
                }}>
                <Select.Option value="choose">Choose Token</Select.Option>
                {availableAssets && availableAssets?.tokenSymbol?.map((token:string)=>{
                  return (
                    <Select.Option key={token} value={token}>
                      <Row justify={'space-between'} align={'middle'} onClick={()=>{setIsToken(true)}}>
                        <Col span={6}>
                          <Image preview={false} height={'25px'} style={{borderRadius:'50%', marginBottom:'4px'}} src={"/src/assets/images/"+token+".png"}/>
                        </Col>
                        <Col span={16}>
                          {token}
                        </Col>
                      </Row>
                    </Select.Option>
                  )
                  }
                )}
                {userForeignAssetBalances && userForeignAssetBalances?.map((userFABalance:any)=>{
                  return (
                    <Select.Option key={userFABalance.symbol} value={userFABalance.assetId}>
                      <Row justify={'space-between'} align={'middle'} onClick={()=>{setIsToken(false)}}>
                        <Col span={6}>
                          <Image preview={false} height={'25px'} style={{borderRadius:'50%', marginBottom:'4px'}} src={"/src/assets/images/"+userFABalance.symbol+".png"}/>
                        </Col>
                        <Col span={16}>
                          {userFABalance.symbol}
                        </Col>
                      </Row>
                    </Select.Option>
                  )
                  }
                )}
              </Select>
            </Form.Item>
          </Col>
          <Col span={16} style={{marginTop:'-12px'}}>
            <Form.Item label="Token Amount to Send">
              <Input value={amountToSend} onChange={(e:any)=>setAmountToSend(e.target.value)}/>
              <Col span={24}>
                <a onClick={()=>setAmountToSend(selectedTokenBalance.free/Math.pow(10,selectedTokenBalance.decimals))} style={{marginTop:'0px', marginBottom:'0px'}}>{selectedTokenBalance && <>Max ({selectedTokenBalance.free/Math.pow(10,selectedTokenBalance.decimals)} {isToken?selectedTokenBalance.token:selectedTokenBalance.symbol})</>}</a>
                <br/>
              </Col>
            </Form.Item>
          </Col>
          <Col span={7} style={{marginTop:'-12px'}}>
            <Form.Item label="Token to Pay Fee">
              <Select 
                value={tokenToPayFees} 
                onChange={(value)=>{
                  setTokenToPayFees(value)
                }}>
                <Select.Option value="choose">Choose Token</Select.Option>
                {availableAssets && availableAssets?.tokenSymbol?.map((token:string)=>{
                  return (
                    token==="INTR" &&
                    <Select.Option key={token} value={token}>
                      <Row justify={'space-between'} align={'middle'} onClick={()=>{setIsFeeWithToken(true)}}>
                        <Col span={6}>
                          <Image preview={false} height={'25px'} style={{borderRadius:'50%', marginBottom:'4px'}} src={"/src/assets/images/"+token+".png"}/>
                        </Col>
                        <Col span={16}>
                          {token}
                        </Col>
                      </Row>
                    </Select.Option>
                  )
                  }
                )}
                {userForeignAssetBalances && userForeignAssetBalances?.map((userFABalance:any)=>{
                  return (
                    userFABalance.symbol==="USDT" &&
                    <Select.Option key={userFABalance.symbol} value={userFABalance.assetId}>
                      <Row justify={'space-between'} align={'middle'} onClick={()=>{setIsFeeWithToken(false)}}>
                        <Col span={6}>
                          <Image preview={false} height={'25px'} style={{borderRadius:'50%', marginBottom:'4px'}} src={"/src/assets/images/"+userFABalance.symbol+".png"}/>
                        </Col>
                        <Col span={16}>
                          {userFABalance.symbol}
                        </Col>
                      </Row>
                    </Select.Option>
                  )
                  }
                )}
              </Select>
              <h5 style={{marginTop:'0px'}}>Fee: {estimatedFee}</h5>
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Button onClick={handleTransfer} loading={transactionSuccess===0 && false?true:false} block type='primary'>
              Send
            </Button>
          </Col>
          {currentTransactionStep===1001 &&
            <Col span={24}>
              <h5 style={{color:'red', marginTop:'4px', marginBottom:'-20px'}}>&#10060; Transaction has been cancelled. Please try again.</h5>
            </Col>
          }
        </Row>
        {/* Steps for the Transaction */}
        {currentTransactionStep!==undefined && currentTransactionStep < 10 && 
          <Row style={{marginTop:'24px'}} align={'middle'}>
            <Col style={{borderRight:'2px solid gray'}} span={8}>
              <Steps
                size='small'
                status={transactionSuccess===0?'process':transactionSuccess===-1?'error':'finish'}
                direction="vertical"
                current={currentTransactionStep}
                items={[
                  {
                    title: '1. Ready',
                    icon: transactionSuccess===-1?<CloseCircleOutlined/>:currentTransactionStep===0 && <LoadingOutlined />,
                  },
                  {
                    title: '2. Pay Fee',
                    icon: transactionSuccess===-1?<CloseCircleOutlined/>:currentTransactionStep===1 && <LoadingOutlined />,
                  },
                  {
                    title: '3. Withdraw',
                    icon: transactionSuccess===-1?<CloseCircleOutlined/>:currentTransactionStep===2 && <LoadingOutlined />,
                  },
                  {
                    title: '4. Transfer',
                    icon: transactionSuccess===-1?<CloseCircleOutlined/>:currentTransactionStep===3 && <LoadingOutlined />,
                  },
                  {
                    title: '5. Deposit',
                    icon: transactionSuccess===-1?<CloseCircleOutlined/>:currentTransactionStep===4 && <LoadingOutlined />,
                  },
                  {
                    title: '6. Finalize',
                  }
                ]}
              />
            </Col>
            <Col style={{marginLeft:'12px'}} span={15}>
              <Row justify={'center'}>
                <Row justify={'center'}>
                  <Col span={24} style={{textAlign:'center'}}>
                    {currentTransactionStep===5?
                    <CheckCircleOutlined style={{fontSize:'64px', color:'green'}}/>
                    :
                    transactionSuccess===-1?
                    <CloseCircleOutlined style={{fontSize:'64px', color:'red'}}/>
                    :
                    <QuestionCircleOutlined style={{fontSize:'64px', color:'#1677ff'}} />
                    }
                  </Col>
                  <Col span={24} style={{textAlign:'center'}}>
                    <h2 style={{marginBottom:'0px'}}>{transactionStepsData[currentTransactionStep].title}</h2>
                  </Col>
                  <Col span={24} style={{textAlign:'center'}}>
                    {transactionSuccess===-1?
                      <h5>{transactionStepsData[currentTransactionStep].onError}</h5>
                      :
                      currentTransactionStep===5?
                      <h5>Block Number: {blcokNumber}<br/>Block Hash: {blockHash}</h5>
                      :
                      <h5>{transactionStepsData[currentTransactionStep].description}</h5>
                    }
                  </Col>

                </Row>
              </Row>
            </Col>
          </Row>
        }
      </Modal>
    </>
  ) 
}

export default App

