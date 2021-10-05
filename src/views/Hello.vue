<template>
  <div id="app">
    <h2>Vue.js WebSocket Tutorial</h2> 
    <button v-on:click="sendMessage('hello')">Send Message</button>
  </div>
</template>
<script>
import {queryHeadsetId} from '../../../cortex_code_example'
export default {
  name: 'App',
  data: function() {
    return {
      connection: null,
      ids: []
    
    }
  },
  methods: {
    sendMessage: function(message) {
      console.log("Hello")
      console.log(this.connection);
      this.connection.send(message);
    },

     queryHeadsetId() {
      queryHeadsetId().then(response => {
        console.log(response)
        this.ids = response
        
      })

  },


  created: function() {
    console.log("Starting connection to WebSocket Server")
    this.connection = new WebSocket("wss://localhost:6868")

    this.connection.onmessage = function(event) {
      console.log(event);
    }

    this.connection.onopen = function(event) {
      console.log(event)
      console.log("Successfully connected to the echo websocket server...")
    }

  },


  },
  
 mounted () {
    this.queryHeadsetId();
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>