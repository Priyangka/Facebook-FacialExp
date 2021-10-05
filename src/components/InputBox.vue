<template>
  <div
    class="bg-white p-2 rounded-2xl shadow-md text-gray-500 font-medium mt-6"
  >
    <div class="flex items-center space-x-4 p-2">
      
      <img
        :src="user?.photoURL"
        :alt="user?.displayName"
        class="h-10 w-10 rounded-full object-cover icon"
        loading="lazy"
      />
      <form @submit.prevent="onSubmit" class="flex flex-1">
        <input
          id="postbox"
          type="text"
          :placeholder="`what's on your mind, ${user?.displayName}?`"
          class="
            rounded-full
            h-12
            bg-gray-100
            flex-grow
            px-5
            focus:outline-none
          "
          v-model="messagetext"
        />
      </form>
    </div>
    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" @click="callheadgear">
          Get Headgear Data
      </button>
       <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" @click="authorize">
          Authorize
      </button>
       <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" @click="session">
          Session
      </button>
    <div class="flex justify-evenly p-3 border-t">
      <div class="inputIcon">
        <VideoCameraIcon class="h-7 text-red-500" />
        <p class="text-xs sm:text-sm xl:text-base">Live Video</p>
      </div>
      <div @click="$refs.filepickerRef.click()" class="inputIcon">
        <CameraIcon class="h-7 text-green-400" />
        <p class="text-xs sm:text-sm xl:text-base">Photo/Video</p>
        <input
          ref="filepickerRef"
          type="file"
          accept="image/png, image/gif, image/jpeg"
          class="hidden"
          @change="addImageToPost($event)"
        />
      </div>
      <div class="inputIcon">
        <EmojiHappyIcon class="h-7 text-yellow-300" />
        <p class="text-xs sm:text-sm xl:text-base">Feeling</p>
      </div>
      <div
        class="
          flex flex-col
          filter
          hover:brightness-110
          transition
          duration-150
          transform
          hover:scale-105
          cursor-pointer
        "
        v-if="imageToPost"
        @click="removeImage"
      >
        <img :src="imageToPost" class="h-10 object-contain" />
        <p class="text-xs text-red-500 text-center">Remove</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { EmojiHappyIcon } from "@heroicons/vue/outline";
import { CameraIcon, VideoCameraIcon } from "@heroicons/vue/solid";
import db, { storage, timestamp } from "../firebase";

const user = {
  "license":"3517b92a-dc6e-426a-a84f-1596e8722bf8",
  "clientId": "pPDiF2sS6b5xqEEJEFub1AeW70J0k21P8RAXryg8",
  "clientSecret": "LgBROetrs7ToM7IrpFhIuCcL2yg0hEtTEnna3j2tUZyNIrc0u9rpaboAbZ20qG3VaTf4mCr5pQDkV1fVU6H1pJiV5TSuNzCxK0huSXI21mVLWBkGEa5VZJB6qyiwJblD",
  "debit":1
}
export default {
  data() {
    return {
      messagetext: null
    }
  },
  setup() {
    const user = ref(null);
    const filepickerRef = ref(null);
    const imageToPost = ref(null);
    const message = ref("");

    onMounted(() => {
      user.value = JSON.parse(localStorage.getItem("user"));
    });

    const onSubmit = () => {
      if (message.value === "") return;
      const data = {
        message: message.value,
        name: user.value.displayName,
        email: user.value.email,
        image: user.value.photoURL,
        uid: user.value.uid,
        timestamp: timestamp,
      };

      db.collection("posts")
        .add(data)
        .then((doc) => {
          if (imageToPost.value) {
            const uploadTask = storage
              .ref(`posts/${doc.id}`)
              .putString(imageToPost.value, "data_url");

            removeImage();

            uploadTask.on(
              "state_change",
              null,
              (error) => console.log(error),
              () => {
                // On a completed upload
                storage
                  .ref("posts")
                  .child(doc.id)
                  .getDownloadURL()
                  .then((url) => {
                    db.collection("posts").doc(doc.id).set(
                      {
                        postImage: url,
                      },
                      { merge: true }
                    );
                  });
              }
            );
          }

          message.value = "";
        })
        .catch((error) => console.log(error));
    };

    const addImageToPost = (e) => {
      const reader = new FileReader();
      if (e.target.files[0]) {
        reader.readAsDataURL(e.target.files[0]);
      }

      reader.onload = (readerEvent) => {
        imageToPost.value = readerEvent.target.result;
      };
    };

    const removeImage = () => (imageToPost.value = null);

    return {
      user,
      message,
      onSubmit,
      addImageToPost,
      filepickerRef,
      imageToPost,
      removeImage,
    };
  },
  components: {
    EmojiHappyIcon,
    CameraIcon,
    VideoCameraIcon,
  },
  mounted() {
    this.$socket.onmessage = (response) => {
      console.log(JSON.parse(response.data));
      this.messagetext = "It is working"
    }
  },
  methods: {
    callheadgear: async function() {
        const QUERY_HEADSET_ID = 2
        let queryHeadsetRequest =  {
            "jsonrpc": "2.0", 
            "id": QUERY_HEADSET_ID,
            "method": "queryHeadsets",
            "params": {}
        }
        
        this.$socket.send(JSON.stringify(queryHeadsetRequest));
        this.$socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id']==QUERY_HEADSET_ID){
                        // console.log(data)
                        // console.log(JSON.parse(data)['result'].length)
                        if(JSON.parse(data)['result'].length > 0)
                        {
                            let headsetId = JSON.parse(data)['result'][0]['id']
                            resolve(headsetId)
                          
                        }
                        else
                        {
                          console.log('No have any headset, please connect headset with your pc.')
                        }
                    }
                   
                } catch (error) {}
            })
           
    },
    authorize: async function() {
     
        const AUTHORIZE_ID = 4
         let authorizeRequest = 
         { 
                "jsonrpc": "2.0", 
                "id":AUTHORIZE_ID,
                "method": "authorize", 
                "params": { 
                    "clientId": user.clientId, 
                    "clientSecret": user.clientSecret, 
                    "license": user.license, 
                    "debit": user.debit
                }
                }
            this.$socket.send(JSON.stringify(authorizeRequest))
            this.$slots.on
            let self=this
            this.$socket.on('message', (data)=>{
             
                try {
                    if(JSON.parse(data)['id']==AUTHORIZE_ID){
                        let cortexToken = JSON.parse(data)['result']['cortexToken']
                         // console.log(JSON.stringify(cortexToken))
                       self.session(cortexToken)
                    }
                } catch (error) {}
            })
    

        },
     session:async function(cortexToken,headsetId)
     { //console.log (cortexToken);
       const CREATE_SESSION_ID = 5
        let createSessionRequest = 
            { 
            "jsonrpc": "2.0",
            "id": CREATE_SESSION_ID,
            "method": "createSession",
            "params": {
                "cortexToken": cortexToken,
                "headset": headsetId,
                "status": "active"
            }
        }
            this.$socket.send(JSON.stringify(createSessionRequest));
            this.$socket.on('message', (data)=>{
                try {
                    if(JSON.parse(data)['id']==CREATE_SESSION_ID){
                        let sessionId = JSON.parse(data)['result']['id']
                        resolve(sessionId)
                    }
                } catch (error) {}
            })
        

     }
  }

}

</script>

<style lang="scss" scoped>
</style>