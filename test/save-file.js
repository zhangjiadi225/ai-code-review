const aiService = require('../src/services/ai')

const fn = async () => {
    const review = {
        commitId: 'id',
        commitMessage: 'commit.message',
        author: 'commit.author',
        timestamp: new Date().toISOString(),
        suggestions: ['msg1', 'msg2'],
    }
    aiService.saveToFile(review)
}

fn()