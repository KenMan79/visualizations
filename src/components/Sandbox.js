import React, { Component } from 'react';
import {nodes, network} from '../c2_NetworkDoubleSpends/createNetSim'
import Controls from './Controls.js'
import Ledgers from './Ledgers.jsx'
import Instructions from './Instructions.jsx'
import Tray from './Tray.jsx'
import Graph from './Graph.js'
import NodeControls from './NodeControls.js'
import * as d3 from 'd3'

// import Parameters from './Parameters.js'
import clone  from 'clone';

const ICONS = [
  'https://i.imgur.com/Wi9yFXw.png',
  'https://i.imgur.com/U5Y99Rm.png',
  'https://i.imgur.com/NPH4rqg.png',
  'https://i.imgur.com/MptO0GC.png',
  'https://i.imgur.com/yHwPVBF.png',
  'https://i.imgur.com/yvv1MMb.png',
  'https://i.imgur.com/I4Dlkik.png',
  'https://i.imgur.com/jNB8LS6.png'
]

const TICK_LENGTH = 300 //ms

// graph payload (with minimalist structure)
const data = {
  nodes: [],
  links: []
}

let iconMap = {}
for (let i = 0; i < nodes.length; i++) {
  nodes[i].gerbil = ICONS[i]
  iconMap[nodes[i].pid] = ICONS[i]
}
for (const node of nodes) {
  // connect them
  for (const peer of network.peers[node.pid]) {
    data.links.push({
      source: node.pid,
      target: peer.pid
    })
  }
}

class Sandbox extends Component {
  constructor() {
    super()
    this.state = {
      // clickedNode: null,
      selectedNodes:{},
      history: [],
      paused: false,
      pausedTxs: true,
      speed: 1,
      showPopup: true
    }
  }

  componentDidMount() {
    for (let node of nodes) {
      this.showState(node)
    }
    this.timer = d3.interval(this.tick.bind(this), TICK_LENGTH/this.state.speed);
  }

  setMessageQueue(currNetwork){
    let oldQ = currNetwork.messageQueue
    const messages = []
    Object.keys(oldQ).forEach(function(key,index) {
      for (let message of oldQ[key]) {
        const newMsg = {...message, time: currNetwork.time}
        newMsg.recipient = newMsg.recipient.pid
        messages.push(newMsg)
      }
    });
    return messages
  }

  tick() {
    network.tick()
    const history = this.state.history
    history.push(clone(network)) // push a deep clone of the network object
    const messages = this.setMessageQueue(network)
    this.setState({history: history, messages: messages})
  }

  // getTick(time) {
  //   const {history, selectedNodes, clickedNode} = this.state
  //   if(time > history.length) {
  //     throw new Error('You skipped a time step!')
  //   } else if (time === history.length ) {
  //     this.tick()
  //   }
  //   let messages = this.setMessageQueue(history[time])
  //   this.setState({messages: messages, time: time})
  // }

  // getNode (nodeId, time) {
  //   const currNetwork = this.state.history[time]
  //   if (currNetwork) {
  //     return currNetwork.agents.find((node) => {
  //       return node.pid === nodeId;
  //     });
  //   }
  // }

  getCurrNode(nodeId) {
    if (network) {
      return network.agents.find((node) => node.pid === nodeId);
    }
  }

  onClickNode (node, x, y) {
    const {clickedNode} = this.state

    if (clickedNode && node.pid === clickedNode.pid) {
      this.setState({clickedNode: null})
    } else {
      this.setState({clickedNode: {...node, clickedX: x, clickedY: y}})
    }
  };

  pause(){
    const {paused, speed} = this.state
    if (paused) {
      this.timer = d3.interval(this.tick.bind(this), TICK_LENGTH/this.state.speed);
    } else {
      this.timer.stop()
    }
    this.setState({ paused: !paused })

    //this.state.speed = 1    //(reset FF/Rewind)
  }
  pauseTxs(){
    this.setState({ pausedTxs: !this.state.pausedTxs })
    for(let node of nodes) {
      node.pausedSpending = !node.pausedSpending
    }
  }

  adjustSpeed(speed){
    this.setState({speed : speed }, () => {
     this.timer.stop()
     this.timer = d3.interval(this.tick.bind(this), TICK_LENGTH/this.state.speed);
   })
  }

  doubleSpend(evilNode){
    evilNode = this.getCurrNode(evilNode.pid)
    const drEvil = evilNode.pid
    const victims = [network.peers[drEvil][0], network.peers[drEvil][1]]
    const spends = [evilNode.generateTx(victims[0].wallet.address, 10), evilNode.generateTx(victims[1].wallet.address, 10)]
    spends[0].isDoubleSpend = true
    spends[1].isDoubleSpend = true
    network.broadcastTo(drEvil, victims[0], spends[0])
    network.broadcastTo(drEvil, victims[1], spends[1])

    console.log('Double spender:', drEvil, 'victims:', victims, 'spends:', spends)
  }

  spend(currNode){
    const node = this.getCurrNode(currNode.pid)
    const tx = node.generateTx(node.getRandomReceiver(), 10)
    node.transactions.push(tx)
    node.applyTransaction(tx)
    // Broadcast this tx to the network
    network.broadcast(node.pid, tx)

    // initiate random spend
  }

  showState(node){
    // create popup with state
    const {selectedNodes} = this.state
    if (selectedNodes[node.pid]) {
      delete selectedNodes[node.pid]
    } else {
      selectedNodes[node.pid] = node
    }
    this.setState({selectedNodes: selectedNodes})
  }

  togglePopup() {
    this.setState({
      showPopup: !this.state.showPopup
    });
  }

  deselectNode(){
    this.setState({clickedNode: null})
  }

  reset(){
    console.log('reset')
    this.getTick(0)
  }
  setSpeed(value){
    let speed = value/1000.0
    this.setState({speed : speed})
    console.log('speeedooo', speed)

  }
  setLatency(event){
    let raw = event.target.value
    let scaled = Math.min(Math.max(parseInt(raw), 1), 10)
    console.log('latency', raw, scaled)

  }
  setPacketLoss(event){
    let raw = event.target.value
    let scaled = Math.min(Math.max(parseInt(raw), 1), 20)
    console.log('packetloss', raw, scaled)

  }
  render() {
    const {clickedNode, selectedNodes, messages, time, paused, pausedTxs, speed} = this.state
    return (
      <div id='App-container'>
        <div id='Text-container'>
          <div id='Overflow-top'></div>
          <h3>2.2: The Double Spend</h3>
          <div id='Text'>
            Building a centralized payments processor like Paypal is simple, but relies on trust that Paypal will not break the rules. A simple way to decentralize PayPal is to make clients download all transactions and run the PayPal code to generate their belief of the current state.
            <br/>
            <br/>
            In a decentralized system, we cannot rely on a global clock, and we cannot assume a constant latency for all messages to be delivered.
            <br/>
            <br/>
            This is the root cause of the double spend problem: an attacker can send one message to Jing & another message to Karl each spending the same coins. If Jing and Karl both accept those transactions, their states will diverge and we will have a fork. Not good! We need decentralized consensus!
            </div>
          <div id='Overflow-bottom'></div>
        </div>
        <div id = 'Network-container'>
          <div id = 'Graph-container'>
            <Tray
              nodes={nodes}
              selectedNodes={selectedNodes}
              showState = {this.showState.bind(this)}
              icons = {iconMap}
            />
            <Ledgers
              nodes={selectedNodes}
              showState = {this.showState.bind(this)}
              icons = {iconMap}
            />
            <Graph
              nodes={nodes}
              links={data.links}
              messages = {messages || []}
              onClick = {this.onClickNode.bind(this)}
              speed = {speed}
           />
           {clickedNode ? (
            <div style= {{
              position:'absolute',
              left: clickedNode.clickedX - 400,
              top: clickedNode.clickedY
            }}>
              <NodeControls
                doubleSpend={this.doubleSpend.bind(this, clickedNode)}
                spend={this.spend.bind(this, clickedNode)}
                hide={this.deselectNode.bind(this)}
              />
              </div>) : ''}
          </div>
          <div id='Input-container'>
            <div id='Controls-container'>
              <Controls
              onPause = {this.pause.bind(this)}
              onPauseTxs = {this.pauseTxs.bind(this)}
              paused = {paused}
              pausedTxs = {pausedTxs}
              togglePopup = {this.togglePopup.bind(this)}
              adjustSpeed = {this.adjustSpeed.bind(this, 2.0)}/>
            </div>
            {/*<div id='Parameters-container'>
              <Parameters
              setSpeed = {this.setSpeed.bind(this)}
              setLatency = {this.setLatency.bind(this)}/>
            </div>*/}
          </div>
        </div>
        <Instructions
        show= {this.state.showPopup}
        handleClose={this.togglePopup.bind(this)}
        />
      </div>
    );
  }
}

export default Sandbox;
