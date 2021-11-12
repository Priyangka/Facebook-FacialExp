const expressionPoint = 10
const thresholdPoint = 20
const minimumConfidence = 50

const emotions = [
    { 
        name: 'neutral', 
        iconName: 'neutral.png', 
        message: 'I am nuetral' 
    },
    { 
        name: 'happy', 
        iconName: 'happy.png', 
        message: 'I am happy' 
    },
    { 
        name: 'surprise', 
        iconName: 'surprise.png', 
        message: 'I am surprised' 
    },
    { 
        name: 'sad', 
        iconName: 'sad.png', 
        message: 'I am sad' 
    },
    { 
        name: 'angry', 
        iconName: 'angry.png', 
        message: 'I am angry' 
    },
]

export { expressionPoint, thresholdPoint, minimumConfidence, emotions as default }