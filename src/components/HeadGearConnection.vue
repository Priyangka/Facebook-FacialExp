<template>
    <div :class="['flex flex-col items-center justify-center bg-white rounded-xl p-5 mb-3 w-full', isTrainingPage ? 'h-full' : '']">
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

                <div v-if="!isTrainingPage" class="flex flex-col">
                    <p v-if="detectionerr" class="py-3 w-full text-center text-red-700">{{ detectionerr }}</p>

                    <label v-if="detecting || analyzing" class="text-md font-medium text-indigo-500">Detecting Emotion...</label>
                    <button v-else-if="hasEmotions" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full" @click="detectEmotion">
                        Detect Emotion
                    </button>
                    <p v-else class="py-3 w-full text-center text-red-700">No emotions trained</p>
                </div>

                <button v-if="isTrainingPage" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full mt-2" @click="navigateToFeeds">
                    Back to Feeds
                </button>
                <button v-else class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full mt-2" @click="navigateToTrain">
                    Train Expressions
                </button>
            </div>
            <div v-else class="d-flex flex-col items-center justify-center">
                <div class="flex flex-row items-center justify-center">
                    <XIcon class="h-5 w-5 text-red-700 mr-1" />
                    <label for="" class="w-full text-center text-red-700">Not Connected</label>
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
import db, { fieldValue } from "../firebase";
import _ from 'lodash'

import emotions, { expressionPoint, thresholdPoint, minimumConfidence } from './../emotion'

const emitter = require('tiny-emitter/instance');

const user = {
    "license":"3517b92a-dc6e-426a-a84f-1596e8722bf8",
    "clientId": "pPDiF2sS6b5xqEEJEFub1AeW70J0k21P8RAXryg8",
    "clientSecret": "LgBROetrs7ToM7IrpFhIuCcL2yg0hEtTEnna3j2tUZyNIrc0u9rpaboAbZ20qG3VaTf4mCr5pQDkV1fVU6H1pJiV5TSuNzCxK0huSXI21mVLWBkGEa5VZJB6qyiwJblD",
    "debit":1
}

const emotionArr = emotions.map(({ name }) => name)

const REQUEST_ACCESS_ID = 1
const AUTHORIZE_ID = 2
const QUERY_HEADSET_ID = 3
const QUERY_SESSION_ID = 4
const CREATE_SESSION_ID = 5
const SUB_REQUEST_ID = 6
const UNSUB_REQUEST_ID = 7

export default {
    props: ['currentTraining', 'isTrainingPage'],
    data() {
        return {
            headgear: {},
            cortex: {},
            errormsg: '',
            detectionerr: '',
            user: null,
            trainedEmotions: {},
            facReceived: false,
            detecting: false,
            analyzing: false
        }
    },
    components: {
        XIcon,
        CheckIcon
    },
    mounted() {
        this.user = JSON.parse(localStorage.getItem("user"));

        this.$socket.onmessage = (response) => {
            const data = JSON.parse(response.data)
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
                }
                
                if (!this.facReceived && data.fac && data.fac.length > 0) {
                    this.facReceived = true
                    this.unsubscribe(['fac'])
                    this.updateEmotion(data.fac)
                } else if (this.detecting && data.fac && data.fac.length > 0) {
                    this.detecting = false
                    this.recognizeEmotion(data.fac)
                    this.unsubscribe(['fac'])
                }
            }
        }
    },
    created() {
        this.requestAccess();
    },
    computed: {
        hasEmotions: function() {
            return Object.values(this.trainedEmotions).some(emo => emo.length > 0)
        }
    },
    watch: {
        'user.uid': function(uid) {
            if (uid) {
                this.fetchEmotions(uid)
            }
        },
        trainedEmotions: {
            deep: true,
            handler(trained) {
                this.$emit('updated-training', trained)
            }
        }
    },
    methods: {
        navigateToTrain: function() {
            this.$router.push('/train-expression')
        },
        navigateToFeeds: function() {
            this.$router.replace('/')
        },
        sendSocket: function(data) {
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
            this.facReceived = false
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
            this.subscribe()
        },
        eraseEmotion: function(emotion) {
            let self = this
            db.collection('emotions').doc(this.user.uid).update({
                [emotion]: []
            }).then(() => {
                self.$emit('update-erased-status', emotion, 'erased')
            })
        },
        fetchEmotions: function(uid) {
            let self = this
            db.collection('emotions').doc(uid)
                .onSnapshot(snapshot => {
                    if (snapshot.exists) {
                        let dbEmotions = snapshot.data()
                        let trained = {}
                        _.forEach(dbEmotions, function(data, key) {
                            trained[key] = data.map(emo => JSON.parse(emo))
                        });
                        self.trainedEmotions = trained
                    } else {
                        self.addUserToFirebase(uid)
                    }
                })
        },
        addUserToFirebase: function(uid) {
            let data = emotionArr.reduce((acc, curr) => (acc[curr] = [], acc), {})
            db.collection('emotions').doc(uid).set(data, { merge: true })
        },
        updateEmotion: function(data) {
            let self = this
            setTimeout(() => {
                db.collection('emotions').doc(self.user.uid).update({
                    [self.currentTraining]: fieldValue.arrayUnion(JSON.stringify(data))
                }).then(() => {
                    self.$emit('updated-status', 'completed')
                });
            }, 1000);
        },
        detectEmotion: function() {
            this.detecting = true
            this.detectionerr = ''
            this.subscribe()
        },
        recognizeEmotion: function(data) {
            this.analyzing = true

            let self = this
            let confidence = {}
            _.forEach(this.trainedEmotions, function(trained, key) {
                if (emotionArr.includes(key)) {
                    confidence[key] = self.calcConfidence(data, trained)
                }
            });
            console.log(confidence);

            let mostConfident =  Object.keys(confidence).reduce((acc, curr) => confidence[acc] > confidence[curr] ? acc : curr);
            setTimeout(() => {
                if (confidence[mostConfident] >= minimumConfidence) {
                    self.sendEmotionMessage(mostConfident)
                } else {
                    self.detectionerr = 'Unable to recognize emotion. Consider training more expressions.'
                }
                self.analyzing = false
            }, 2000);
        },
        calcConfidence: function(data, trained) {
            return trained.reduce((acc, curr) => {
                let point = 0
                point += curr[0] == data[0] ? expressionPoint : 0
                point += curr[1] == data[1] ? expressionPoint : 0
                point += curr[3] == data[3] ? expressionPoint : 0

                point += (thresholdPoint - Math.round(Math.abs(curr[2] - data[2]) * thresholdPoint))
                point += (thresholdPoint - Math.round(Math.abs(curr[4] - data[4]) * thresholdPoint))

                return acc < point ? point : acc
            }, 0)
        },
        sendEmotionMessage: function(emotion) {
            const message = emotions.find(({ name }) => name == emotion)?.message
            if (message) {
                emitter.emit('emotion-message-sent', message); 
            } else {
                this.detectionerr = `No message specified for ${emotion}`
            }
        }
    }
}
</script>

<style>

</style>