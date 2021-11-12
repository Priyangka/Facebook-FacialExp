<template>
	<div class="bg-white p-2 rounded-2xl shadow-md text-gray-500 font-medium mt-6">
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
					ref="messagebox"
					type="text"
					:placeholder="`What's on your mind, ${user?.displayName}?`"
					class="
						rounded-full
						h-12
						bg-gray-100
						flex-grow
						px-5
						focus:outline-none
					"
					v-model="message"
				/>

				<input type="submit" class="bg-blue-500 hover:bg-blue-700 cursor-pointer text-white font-bold py-2 px-4 ml-1 rounded-full" value="Submit Post">				
			</form>

			
		</div>
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
				<discord-picker
					input
					:value="value"
					id="discord_picker"
					type="text"
					:placeholder="`What's on your mind, ${user?.displayName}?`"
					api-key="BEASSSWYZQI2"
					@update:value="value = $event"
					@emoji="setEmoji"
					@gif="setGif"
					v-model="message"
				/>
				<p class="text-xs sm:text-sm xl:text-base">GIF/Emotion</p>
				<!-- <EmojiHappyIcon class="h-7 text-yellow-300" /> -->
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
import { CameraIcon, VideoCameraIcon } from "@heroicons/vue/solid";
import db, { storage, timestamp } from "../firebase";

import DiscordPicker from 'vue3-discordpicker'
const emitter = require('tiny-emitter/instance');

export default {
	data () {
		return {
			value: '',
			selectedGif: null
		}
	},
	setup() {
		const user = ref(null);
		const filepickerRef = ref(null);
		const imageToPost = ref(null);
		const message = ref("");
		const messagebox = ref(null);

		onMounted(() => {
			user.value = JSON.parse(localStorage.getItem("user"));
		});

		emitter.on('emotion-message-sent', function(msg) {
			message.value = msg
		})

		const setEmoji = (emoji) => {
			const startPos = messagebox.value.selectionStart,
				endPos = messagebox.value.selectionEnd,
				currText = message.value,
				toInsert = emoji + ' '
			let cursorPos = startPos

			message.value = currText.substring(0, startPos) + toInsert + currText.substring(endPos, currText.length)

			setTimeout(() => {
				cursorPos += toInsert.length;
				messagebox.value.selectionStart = messagebox.value.selectionEnd = cursorPos;
			}, 10);
		}

		const setGif = (gif) => {
			imageToPost.value = gif
		}

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
			setEmoji,
			setGif,
			messagebox
		};
	},
	components: {
		CameraIcon,
		VideoCameraIcon,
		DiscordPicker
	}
}
</script>

<style>
	.vue3-emojipicker .-top-4 {
		top: 32rem;
		right: 0;
	}

	div#discord_picker {
		width: auto !important;
		padding-left: 1rem;
	}
	
	div#discord_picker>div.relative.w-full {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	div#discord_picker div.bg-grey-400.emojibutton__active {
		background-color: transparent;
	}

	div.vue3-emojipicker {
		width: 15%;
	}

	div.vue3-emojipicker div.emojibutton__active {
		margin: 0px;
	}
	
	div.vue3-emojipicker div.emojibutton__active>div.w-full {
		display: none;
	}
	
	div.vue3-emojipicker div.emojibutton__active div.vue3-discord-emojipicker__emojibutton {
		padding-right: 1.4rem;
		width: 20px;
	}
</style>