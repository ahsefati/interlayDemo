import {WsProvider, ApiPromise} from '@polkadot/api'
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp'
import { InjectedAccountWithMeta, InjectedExtension, } from '@polkadot/extension-inject/types'
import {useEffect, useState } from 'react'
import logo from './assets/images/logo.webp'
import interlay from './assets/images/inetrlay.png'
import kintsugi from './assets/images/kintsugi.svg'
import ajuna from './assets/images/ajuna.png'
import transactionStepsData from './assets/data/transactionSteps'


import './App.css'
import { DeploymentUnitOutlined, AppstoreAddOutlined , CreditCardOutlined, ApiOutlined, DollarOutlined, SwapOutlined, SecurityScanOutlined, LoadingOutlined, QuestionCircleOutlined, CheckCircleOutlined, CloseCircleOutlined} from '@ant-design/icons'
import { Button, Col, Image, Row, Steps, Card, Avatar, Select, Modal, Form, Input, InputNumber } from 'antd'
const { Meta } = Card

const NAME = "AHSTEST"

const RPCs: { [key: number]: string } = {
  0: 'wss://api-testnet.interlay.io:443/parachain',
  1: 'wss://api-dev-kintsugi.interlay.io:443/parachain',
  2: 'wss://api-dev-kintsugi.interlay.io:443/parachain'
}

const delay = (ms: number) => {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

const App = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRPCId, setSelectedRPCId] = useState<number>(1000)
  const [connectedWallet, setConnectedWallet] = useState<InjectedExtension[]>()
  const [selectedAddress, setSelectedAddress] = useState<string>("choose")
  const [errorNoNext, setErrorNoNext] = useState('')

  const [api, setApi] = useState<ApiPromise>()
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta>()
  
  // Available Assets (filled when parachain is choosen)
  const [availableAssets, setAvailableAssets] = useState<any>({})
  // Balances
  const [userBalances, setUserBalances] = useState<any[]>([])
  // Send token
  const [tokenToSend, setTokenToSend] = useState('choose')
  const [selectedTokenBalance, setSelectedTokenBalance] = useState<any>()
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
      const time = await api.query.timestamp.now()
      const availableAssets = await api.rpc.system.properties()
      // console.log(availableAssets.toPrimitive())
      setAvailableAssets(availableAssets.toPrimitive())
      
      // console.log(time.toPrimitive())
      // console.log(time.toPrimitive())
      // console.log(availableAssets.toPrimitive())
    })()

  }, [api])

  const handleConnection = async () => {
    await web3Enable(NAME)
          .then(data=>setConnectedWallet(data))
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
      .then((data)=>{setErrorNoNext('success')})
      .catch((error)=>{setErrorNoNext('Address is not valid for this parachain. Please choose another account!')})
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
    try {
      let index = 0
      const balancesPromises = availableAssets?.tokenSymbol.map(async (token: string) => {
        const data:any = await api.query.tokens.accounts(selectedAccount?.address, { Token: token })
        const tokenBalance = { 'token': token, 'decimals': availableAssets.tokenDecimals[index], ...data.toPrimitive() }
        index+=1
        return tokenBalance
      })
  
      const balances = await Promise.all(balancesPromises || [])
      console.log(balances)
      setUserBalances([...balances])
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  const handleTransfer = async () => {
    setTransactionSuccess(0)
    setCurrentTransactionStep(0)
    const SENDER = '' + selectedAccount?.address.toString()
    const injector = await web3FromAddress(SENDER)
    const amountToSendMain = amountToSend * Math.pow(10,selectedTokenBalance.decimals)
    // const len = api?.tx.tokens.transfer(addressToSend, { Token: tokenToSend }, amountToSendMain).length
    const result = await api?.tx.tokens.transfer(addressToSend, { Token: tokenToSend }, amountToSendMain)
                  .signAndSend(SENDER, { signer: injector.signer }, (result:any)=>{setTransactionResult(result.toHuman())}).catch((error)=>{setCurrentTransactionStep(1001); setTransactionSuccess(-10)})

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
        await delay(2500)
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
            await delay(2500)
            setCurrentTransactionStep(4)
            await delay(2500)
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
    <Button onClick={handleConnection} disabled={connectedWallet?true:false} type='primary'>Connect{connectedWallet?'ed':''}</Button>
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
      <Row justify={'center'} style={{marginTop:'48px'}}>
        <Col span={16}>
          <Image preview={false} src={logo}/>
        </Col>
      </Row>
      <Row justify={'center'}>
        <Col span={16}>
          <Row style={{marginTop:'12px'}}>
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
          <Row style={{minHeight:'300px', marginTop:'18px'}}>
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
        onOk={() => setModalBalance(false)}
        onCancel={() => setModalBalance(false)}
      >
        <Row justify={'space-evenly'} style={{marginTop:'28px'}}>
          {userBalances.map(userBalance=>{
            return(
              <Col key={userBalance.token} className='balanceToHover' style={{marginBottom:'18px'}} span={10}>
                <Row justify={'space-around'} align={'top'}>
                  <Col span={6}>
                    <Image preview={false} src={"/src/assets/images/"+userBalance.token+".png"} style={{borderRadius:'50%'}} height={'40px'} width={'40px'}/>
                  </Col>
                  <Col span={16}>
                    <h3 style={{marginBottom:'-16px', marginTop:'-0px'}}>{userBalance.token}</h3>
                    <h5>
                        Free: {(Number(userBalance.free)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                        <br/>
                        Reserved: {(Number(userBalance.reserved)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                        <br/>
                        Frozen: {(Number(userBalance.frozen)/Math.pow(10,userBalance.decimals)).toFixed(4) || 0}
                    </h5>
                  </Col>
                </Row>
              </Col>
            )
          })}
        </Row>
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
                  setSelectedTokenBalance(userBalances.filter(userbalance=>userbalance.token===value)[0])
                }}>
                <Select.Option value="choose">Choose Token</Select.Option>
                {availableAssets && availableAssets?.tokenSymbol?.map((token:string)=>{
                  return (
                    <Select.Option key={token} value={token}>
                      <Row justify={'space-between'} align={'middle'}>
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
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Amount to Send">
              <Row align={'middle'} justify={'space-between'}>
                <Col span={24}>
                  <InputNumber style={{width:'200px'}} value={amountToSend} onChange={(value:any)=>setAmountToSend(value)}/>
                </Col>
              </Row>
              <Col span={24}>
                <a onClick={()=>setAmountToSend(selectedTokenBalance.free/Math.pow(10,selectedTokenBalance.decimals))} style={{marginTop:'0px', marginBottom:'0px'}}>{selectedTokenBalance && <>Max ({selectedTokenBalance.free/Math.pow(10,selectedTokenBalance.decimals)} {selectedTokenBalance.token})</>}</a>
                <br/>
              </Col>
            </Form.Item>
          </Col>
          <Col span={7}>
            <p style={{marginBottom:'0px', marginTop:'0px', fontSize:'13px'}}>
              Est. Fee: 0.0153 INTR (Bring your own fee: coming soon!)
            </p>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Button onClick={handleTransfer} loading={transactionSuccess===0?true:false} block type='primary'>
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

