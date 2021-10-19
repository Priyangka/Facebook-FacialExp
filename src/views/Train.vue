<template>
    <div class="flex flex-row items-start justify-center p-10 h-full">
        <div class="flex flex-row items-center justify-center w-10/12 h-full">
            <EmotionTraining :currentTraining="currentTraining" :trainingStatus="trainingStatus" :trainedEmotions="trainedEmotions" :erasedTraining="erasedTraining" @train-emotion="trainEmotion" @erase-emotion="eraseEmotion" />
        </div>
        <div class="flex flex-row items-center justify-center w-2/12 h-full">
            <HeadGearConnection ref="headgear" :currentTraining="currentTraining" :isTrainingPage="true" @updated-training="updateTraining" @updated-status="updateStatus" @update-erased-status="updateErasedStatus" />
        </div>
    </div>
</template>

<script>
import HeadGearConnection from './../components/HeadGearConnection.vue'
import EmotionTraining from './../components/EmotionTraining.vue'
export default {
    data() {
        return {
            currentTraining: null,
            trainingStatus: null,
            trainedEmotions: {},
            erasedTraining: {}
        }
    },
    components: {
        HeadGearConnection,
        EmotionTraining
    },
    methods: {
        trainEmotion: function(emotion) {
            this.currentTraining = emotion
            this.trainingStatus = 'started'
            this.$refs.headgear.trainEmotion()
        },
        eraseEmotion: function(emotion) {
            this.updateErasedStatus(emotion, 'erasing')
            this.$refs.headgear.eraseEmotion(emotion)
        },
        updateTraining: function(training) {
            this.trainedEmotions = training
        },
        updateStatus: function(status) {
            this.trainingStatus = status
        },
        updateErasedStatus: function(emotion, status) {
            this.erasedTraining[emotion] = status

            let self = this
            if (status == 'erased') {
                setTimeout(() => {
                    self.erasedTraining[emotion] = ''
                }, 2000);
            }
        }
    }
}
</script>

<style>

</style>