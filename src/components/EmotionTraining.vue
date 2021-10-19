<template>
    <div class="flex flex-col items-center justify-center bg-white rounded-xl p-5 mx-3 w-full h-full">
        <div class="flex flex-col justify-between items-center text-gray-500 py-5">
            <h2 class="text-2xl w-full text-center text-indigo-500">Head Gear Connection</h2>

            <label for="" class="text-lg w-full text-center">
                Each emotion should be trained at least 5 times for better result.
            </label>
            <label for="" class="text-lg w-full text-center">
                Note: Duplicate training records (exactly same reading) will be ignored
            </label>
        </div>

        <div class="flex flex-row space-x-3 items-center justify-center">
            <div v-for="({ name, iconName }) in emotions" :key="`emotion_${name}`" class="w-1/5 py-4 px-8 bg-white border-2 border-gray-700 rounded-lg my-5">
                <div class="flex flex-row items-center justify-start">
                    <img class="w-20 h-20 object-cover rounded-full" :src="require(`./../emotion/icons/${iconName}`)">
                    <h2 class="text-gray-800 text-2xl font-semibold px-3 capitalize">{{ name }}</h2>
                </div>
                <div>
                    <p class="mt-2 text-gray-600 text-center pt-2 text-lg">
                        Trained {{ trainedEmotions[name]?.length || 0 }} times
                    </p>
                </div>
                <div class="flex flex-row">
                    <div v-if="!erasedTraining[name] && !changedTraining[name]" class="flex justify-center w-1/2 mt-4">
                        <button class="text-xl font-medium text-red-500" @click="eraseTraining(name)">Erase</button>
                    </div>
                    <div :class="['flex justify-center mt-4', erasedTraining[name] || changedTraining[name] ? 'w-full' : 'w-1/2']">
                        <label v-if="erasedTraining[name]" class="text-xl text-center font-medium text-red-500">
                            {{ erasedTraining[name] == 'erasing' ? 'Erasing Training...' : (erasedTraining[name] == 'erased' ? 'Training Erased' : 'N/A') }}
                        </label>
                        <label v-else-if="changedTraining[name]" class="text-xl text-center font-medium text-indigo-500">
                            {{ changedTraining[name] == 'started' ? 'Training Started...' : (changedTraining[name] == 'completed' ? 'Training Completed' : 'N/A') }}
                        </label>
                        <button v-else class="text-xl font-medium text-indigo-500" @click="trainEmotion(name)">Train</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'lodash'
import emotions from './../emotion'

export default {
    props: ['currentTraining', 'trainingStatus', 'trainedEmotions', 'erasedTraining'],
    data() {
        return {
            emotions: emotions,
            changedTraining: {}
        }
    },
    watch: {
        trainingStatus: function(val) {
            if (val == 'completed') {
                this.changedTraining[this.currentTraining] = 'completed'

                let self = this
                setTimeout(() => {
                    self.changedTraining[this.currentTraining] = false
                }, 4000);
            } else if (val == 'started') {
                this.changedTraining[this.currentTraining] = 'started'
            }
        }
    },
    methods: {
        trainEmotion: function(emotion) {
            this.$emit('train-emotion', emotion)
        },
        eraseTraining: function(emotion) {
            this.$emit('erase-emotion', emotion)
        }
    }
}
</script>

<style>

</style>