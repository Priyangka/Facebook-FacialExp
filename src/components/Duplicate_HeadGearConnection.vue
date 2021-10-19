<template>
    <div class="flex flex-col items-center justify-center bg-white rounded-xl p-5 mb-3 w-full">
        <div class="flex justify-between items-center text-gray-500 mb-5">
            <h2 class="text-xl w-100 text-center">Head Gear Connection</h2>
        </div>

        <div class="flex flex-col items-center justify-center">
            <img :src="require('./../assets/epoc-x.jpeg')" alt="Epoc-X" class="w-full max-h-28 object-contain">

            <div v-if="headgear.id" class="d-flex flex-col items-start">
                <div class="flex flex-row items-center justify-center">
                    <CheckIcon class="h-5 w-5 text-green-700 mr-1" />
                    <label for="" class="w-100 text-center text-green-700">Connected</label>
                </div>
                <p v-if="headgear.customName" class="py-3 w-full text-center">{{ headgear.customName }}</p>

                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" @click="subscribe(['fac'])">
                    Start Recording
                </button>
                
                <!-- <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" @click="getEmotion()">
                    Start Recording
                </button> -->
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full mt-2" @click="navigateToTrain">
                    Train Expressions
                </button>
            </div>
            <div v-else class="d-flex flex-col items-center justify-center">
                <div class="flex flex-row items-center justify-center">
                    <XIcon class="h-5 w-5 text-red-700 mr-1" />
                    <label for="" class="w-100 text-center text-red-700">Not Connected</label>
                </div>
                <p class="py-3 w-full text-center">{{ errormsg }}</p>

                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" @click="requestAccess">
                    Connect Now
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { XIcon, CheckIcon } from "@heroicons/vue/solid";

const user = {
    "license":"3517b92a-dc6e-426a-a84f-1596e8722bf8",
    "clientId": "pPDiF2sS6b5xqEEJEFub1AeW70J0k21P8RAXryg8",
    "clientSecret": "LgBROetrs7ToM7IrpFhIuCcL2yg0hEtTEnna3j2tUZyNIrc0u9rpaboAbZ20qG3VaTf4mCr5pQDkV1fVU6H1pJiV5TSuNzCxK0huSXI21mVLWBkGEa5VZJB6qyiwJblD",
    "debit":1
}

const emotions = ['neutral', 'surprise', 'frown', 'smile', 'clench']

const REQUEST_ACCESS_ID = 1
const AUTHORIZE_ID = 2
const QUERY_HEADSET_ID = 3
const QUERY_SESSION_ID = 4
const CREATE_SESSION_ID = 5
const SUB_REQUEST_ID = 6
const UNSUB_REQUEST_ID = 7
const SETUP_PROFILE_REQUEST_ID = 8
const QUERY_PROFILE_REQUEST_ID = 9
const TRAINED_ACTIONS_ID = 10
const TRAINING_ID = 11
const EMOTION_REQUEST_ID = 12

export default {
    props: ['currentTraining'],
    data() {
        return {
            headgear: {},
            cortex: {},
            errormsg: '',
            loadedProfile: null,
            user: null,
            emotionAction: 'train',
            toErase: null
        }
    },
    components: {
        XIcon,
        CheckIcon
    },
    watch: {
        loadedProfile: function(profile) {
            if (profile) {
                this.getTrainedActions()
            }
        }
    },
    mounted() {
        this.user = JSON.parse(localStorage.getItem("user"));

        this.$socket.onmessage = (response) => {
            const data = JSON.parse(response.data)

            console.log(data);

            if (data.attention && data.attention.message) {
                this.errormsg = data.attention.message
            } else {
                if (data['id'] == REQUEST_ACCESS_ID) {
                    if (data.result.accessGranted) {
                        this.authorize();
                    } else {
                        this.errormsg = data.result.message
                    }
                } else if (data['id'] == AUTHORIZE_ID) {
                    if (data.error && data.error.message) {
                        this.errormsg = data.error.message
                    } else {
                        this.cortex.token = data.result.cortexToken
                        this.getHeadSets();
                    }
                } else if (data['id'] == QUERY_HEADSET_ID) {
                    let headGear = data.result.find(hg => hg.status == "connected")
                    if (headGear) {
                        this.headgear = headGear
                        this.querySessions();
                        this.queryProfile();
                    } else {
                        this.errormsg = 'No headgear available to connect'
                    }
                } else if (data['id'] == QUERY_SESSION_ID) {
                    if (data.error && data.error.message) {
                        this.errormsg = data.error.message
                    }
                    if (data.result.length > 0) {
                        this.cortex.session = data.result[0].id
                    } else {
                        this.createSession();
                    }
                } else if (data['id'] == CREATE_SESSION_ID) {
                    if (data.error && data.error.message) {
                        this.errormsg = data.error.message
                    }
                    if (data.result && data.result.status == 'activated') {
                        this.cortex.session = data.result.id
                    } else {
                        this.errormsg = 'There was an error when creating session'
                    }
                } else if (data['id'] == SUB_REQUEST_ID) {
                    if (data.result.success && data.result.success.length > 0) {
                        if (data.result.success[0].streamName == 'sys') {
                            if (this.emotionAction == 'erase') {
                                this.trainRequest('erase')
                            } else {
                                this.trainRequest()
                            }
                        }
                    }
                } else if (data['id'] == QUERY_PROFILE_REQUEST_ID) {
                    if (data.result.some(profile => profile.name == this.user.uid)) {
                        this.setupProfile('load')
                    } else {
                        this.setupProfile('create')
                    }
                } else if (data['id'] == SETUP_PROFILE_REQUEST_ID) {
                    if (data.result) {
                        if (data.result.action == 'create') {
                            this.setupProfile('load')
                        } else if (data.result.action == 'load') {
                            this.loadedProfile = data.result.name || null
                        } else if (data.result.action == 'save') {
                            this.getTrainedActions()
                        } else if (data.result.action == 'unload') {
                            this.loadedProfile = null
                        }
                    }
                } else if (data['id'] == TRAINED_ACTIONS_ID) {
                    if (data.result) {
                        this.$emit('update-actions', data.result.trainedActions)
                    }
                } 
                
                if (data['sys']) {
                    if (data['sys'][1] == 'FE_Started') {
                        this.$emit('updated-training', 'started')
                    } else if (data['sys'][1] == 'FE_Succeeded') {
                        this.trainRequest('accept')
                    } else if (data['sys'][1] == 'FE_Completed') {
                        this.$emit('updated-training', 'completed')
                        this.setupProfile('save')
                    } else if (data['sys'][1] == 'FE_DataErased') {
                        this.setupProfile('save')
                    }
                }

                if (data.fac && data.fac.length > 0) {
                    this.unsubscribe(['fac'])
                }
            }
        }
    },
    created() {
        this.requestAccess();
    },
    unmounted() {
        if (this.loadedProfile) {
            this.setupProfile('unload')
        }
    },
    methods: {
        navigateToTrain: function() {
            this.$router.push('/train-expression')
        },
        sendSocket: function(data) {
            console.log('Method : ' + data.method)
            this.$socket.sendObj(data)
        },
        requestAccess: function() {
            let requestAccessRequest = {
                "jsonrpc": "2.0", 
                "method": "requestAccess", 
                "params": { 
                    "clientId": user.clientId, 
                    "clientSecret": user.clientSecret
                },
                "id": REQUEST_ACCESS_ID
            }
            this.sendSocket(requestAccessRequest)
        },
        authorize: function() {
            let authorizeRequest = { 
                "jsonrpc": "2.0", 
                "method": "authorize", 
                "params": { 
                    "clientId": user.clientId, 
                    "clientSecret": user.clientSecret, 
                    "license": user.license, 
                    "debit": user.debit
                },
                "id": AUTHORIZE_ID
            }
            this.sendSocket(authorizeRequest)
        },
        getHeadSets: function() {
            let queryHeadsetRequest =  {
                "jsonrpc": "2.0", 
                "method": "queryHeadsets",
                "params": {},
                "id": QUERY_HEADSET_ID
            }
            this.sendSocket(queryHeadsetRequest)
        },
        querySessions: function() {
            let querySessionRequest = { 
                "jsonrpc": "2.0",
                "method": "querySessions",
                "params": {
                    "cortexToken": this.cortex.token
                },
                "id": QUERY_SESSION_ID
            }
            this.sendSocket(querySessionRequest)
        },
        createSession: function() {
            let createSessionRequest = { 
                "jsonrpc": "2.0",
                "method": "createSession",
                "params": {
                    "cortexToken": this.cortex.token,
                    "headset": this.headgear.id,
                    "status": "active"
                },
                "id": CREATE_SESSION_ID
            }
            this.sendSocket(createSessionRequest)
        },
        subscribe: function(streams=['fac']) {
            let subRequest = { 
                "jsonrpc": "2.0", 
                "method": "subscribe", 
                "params": { 
                    "cortexToken": this.cortex.token,
                    "session": this.cortex.session,
                    "streams": streams
                }, 
                "id": SUB_REQUEST_ID
            }
            this.sendSocket(subRequest)
        },
        unsubscribe: function(streams=['fac']) {
            let unsubRequest = { 
                "jsonrpc": "2.0", 
                "method": "unsubscribe", 
                "params": { 
                    "cortexToken": this.cortex.token,
                    "session": this.cortex.session,
                    "streams": streams
                }, 
                "id": UNSUB_REQUEST_ID
            }
            this.sendSocket(unsubRequest)
        },
        trainEmotion: function() {
            this.emotionAction = 'train'
            this.subscribe()
        },
        eraseEmotion: function(emotion) {
            this.emotionAction = 'erase'
            this.toErase = emotion
            this.subscribe()
        },
        
        
        


        
        setupProfile: function(action) {
            let setupProfileRequest = { 
                "jsonrpc": "2.0", 
                "method": "setupProfile", 
                "params": { 
                    "cortexToken": this.cortex.token,
                    "headset": this.headgear.id,
                    "profile": this.user.uid,
                    "status": action
                }, 
                "id": SETUP_PROFILE_REQUEST_ID
            }
            this.sendSocket(setupProfileRequest)
        },
        queryProfile: function() {
            let queryProfileRequest = { 
                "jsonrpc": "2.0", 
                "method": "queryProfile", 
                "params": { 
                    "cortexToken": this.cortex.token,
                }, 
                "id": QUERY_PROFILE_REQUEST_ID
            }
            this.sendSocket(queryProfileRequest)
        },
        getTrainedActions: function() {
            let trainedRequest = {
                "jsonrpc": "2.0", 
                "method": "getTrainedSignatureActions", 
                "params": {
                    "cortexToken": this.cortex.token,
                    "detection": "facialExpression",
                    "profile": this.loadedProfile,
                }, 
                "id": TRAINED_ACTIONS_ID
            }
            this.sendSocket(trainedRequest)
        },
        trainRequest: function(status='start') {
            let trainingRequest = {
                "jsonrpc": "2.0", 
                "method": "training", 
                "params": {
                    "cortexToken": this.cortex.token,
                    "detection": "facialExpression",
                    "session": this.cortex.session,
                    "action": status == 'erase' ? this.toErase : this.currentTraining,
                    "status": status
                }, 
                "id": TRAINING_ID
            }
            this.sendSocket(trainingRequest)
        },
        getEmotion: function() {
            emotions.forEach(emotion => {
                let emotionRequest = {
                    "jsonrpc": "2.0", 
                    "method": "facialExpressionThreshold", 
                    "params": {
                        "action": emotion,
                        "cortexToken": this.cortex.token,
                        "profile": this.loadedProfile,
                        "status": "get"
                    }, 
                    "id": EMOTION_REQUEST_ID
                }
                console.log(emotionRequest)
                this.sendSocket(emotionRequest)
            });
        }
    }
}
</script>

<style>

</style>