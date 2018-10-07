import React, { Component } from 'react';
import {Graph, Node} from './react-d3-graph-custom/src/index';
import {nodes, network} from './c2_NetworkDoubleSpends/createNetSim'
import networkSim from  './c2_NetworkDoubleSpends/networksim.js'
import Sidebar from './Sidebar.js'

const ICONS = [
  'https://i.imgur.com/Wi9yFXw.png',
  'https://i.imgur.com/BBUyb4e.png',
  'https://i.imgur.com/NPH4rqg.png',
  'https://i.imgur.com/MptO0GC.png',
  'https://i.imgur.com/yHwPVBF.png',
  'https://i.imgur.com/yvv1MMb.png',
  'https://i.imgur.com/I4Dlkik.png',
  'https://i.imgur.com/jNB8LS6.png'
]

// graph payload (with minimalist structure)
const data = {
  nodes: [],
  links: []
}

for (let i = 0; i < nodes.length; i++) {
  // add peers
  data.nodes.push({
    id: nodes[i].pid,
    name: nodes[i].pid.slice(0, 10),
    svg: ICONS[i]
  })
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
  // the graph configuration, you only need to pass down properties
  // that you want to override, otherwise default ones will be used
  const myConfig = {
    automaticRearrangeAfterDropNode: true,
    staticGraph: false,
    nodeHighlightBehavior: true,
    node: {
        size: 120,
        highlightStrokeColor: 'blue',
        labelProperty: 'name'
    },
    link: {
        highlightColor: 'lightblue'
    }
  };




  const onClickLink = function(source, target) {
       window.alert(`Clicked link between ${source} and ${target}`);
  };

  const onMouseOverLink = function(source, target) {

       // window.alert(`Mouse over in link between ${source} and ${target}`);
  };

  const onMouseOutLink = function(source, target) {
       // window.alert(`Mouse out link between ${source} and ${target}`);
  };
// }

const getNode = function (nodeId) {
  return nodes.find((node) => {
    return node.pid === nodeId;
  });
}
const delay = (duration) =>
  new Promise(resolve => setTimeout(resolve, duration))


class Network extends Component {
  constructor() {
    super()
    this.state = {clickedNode: null, history: []}
  }
  componentDidMount() {
    //run when play is hit
    try {
      this.run(300).then(

      )
    } catch (e) {
    }
  }

  setMessageQueue(network){
    let oldQ = network.messageQueue
    var newQ = []
    Object.keys(oldQ).forEach(function(key,index) {
      for (let message of oldQ[key]) {
        newQ.push({...message, rcvTime: key})
      }
    });
    return newQ
  }

  async run (steps) {
    for (let i = 0; i < 300; i++) {
      network.tick()
      const history = this.state.history
      history.push(network)
      let messageQueue = this.setMessageQueue(network)
      this.setState({messages: messageQueue, time: network.time - 1, history: history})
      await delay(1000)
    }
  }
  onClickNode (nodeId) {
      const node = getNode(nodeId)
      // console.log('Clicked node', node.state, node.invalidNonceTxs)
      if (this.state.clickedNode && node.pid === this.state.clickedNode.pid) {
        this.setState({clickedNode: null, isNodeClicked: false})
      } else {
        this.setState({clickedNode: node, isNodeClicked: true})
      }
    };

  onMouseOverNode (nodeId) {
    // const node = getNode(nodeId)
    // this.setState({clickedNode: node})
    // if not clicked, highlight node in green
  };

  onMouseOutNode (nodeId) {
    // if(!this.state.isNodeClicked) this.setState({clickedNode: this.state.prevNode})
    // if not clicked, change nodes color back to normal
  }
  render() {
    const {clickedNode, messages, time} = this.state

    return (
      <div>
        <div id = "Network-graph">
          <Graph
           id='graph-id' // id is mandatory, if no id is defined rd3g will throw an error
           data={data}
           config={myConfig}
           onClickNode={this.onClickNode.bind(this)}
           onClickLink={onClickLink}
           onMouseOverNode={this.onMouseOverNode.bind(this)}
           onMouseOutNode={this.onMouseOutNode.bind(this)}
           onMouseOverLink={onMouseOverLink}
           onMouseOutLink={onMouseOutLink}
           messages={messages}
           time={time}
           speed={0.01}/>
        </div>
        <div id = "Node-state">
        <Sidebar node = {clickedNode}/>
        </div>
      </div>
    );
  }
}

export default Network;
