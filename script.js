import { apiKey } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Handle genre button clicks
    const genreButtons = document.querySelectorAll('.genre-button');
    let selectedGenre = '';  // Store the selected genre

    genreButtons.forEach(button => {
        button.addEventListener('click', function() {
            selectedGenre = this.getAttribute('data-genre');
            if (selectedGenre === 'custom') {
                document.getElementById('custom-genre').style.display = 'block';
            } else {
                document.getElementById('custom-genre').style.display = 'none';
            }
        });
    });

    // Generate story options when the "Generate Story Options" button is clicked
    document.getElementById('generate-story-btn').addEventListener('click', function() {
        // If the genre is custom, use the custom input value
        if (selectedGenre === 'custom') {
            selectedGenre = document.getElementById('custom-genre').value.trim();
        }
        
        // Call generateStoryOptions with the selected genre
        if (selectedGenre) {
            generateStoryOptions(selectedGenre);
        } else {
            console.warn('No genre selected');
        }
    });

    async function generateStoryOptions(genre) {
        if (genre) {
            const storyOptions = await fetchStoryOptions(genre);
            if (storyOptions && storyOptions.length > 0) {
                displayStoryOptions(storyOptions);
            } else {
                console.warn('No story options generated');
            }
        } else {
            console.warn('No genre selected');
        }
    }

    async function fetchStoryOptions(genre) {
        try {
            const response = await fetch('https://api.cohere.ai/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'command-xlarge-nightly',
                    prompt: `Generate brief storylines for the genre: ${genre}`,
                    max_tokens: 200,
                    temperature: 0.7,
                    num_generations: 3
                })
            });

            const data = await response.json();
            console.log('Full API Response:', data);

            if (Array.isArray(data.generations)) {
                return data.generations.map(choice => choice.text);
            } else if (data.text) {
                return [data.text];
            } else {
                console.error('Unexpected response structure:', data);
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch story options:', error);
            return [];
        }
    }

    function displayStoryOptions(storyOptions) {
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = '';  // Clear any previous options
    
        if (Array.isArray(storyOptions) && storyOptions.length > 0) {
            storyOptions.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'story-option-button';  // Apply the new class here
                button.innerText = `${index + 1}: ${option}`;
                button.onclick = () => startStory(option);
                optionsList.appendChild(button);
            });
    
            document.getElementById('story-options').style.display = 'block';
        } else {
            console.warn('No valid story options to display');
        }
    }
    
    let currentStory = '';
    let storySummary = '';

    async function startStory(summary) {
        storySummary = summary;  // Store the summary for continuation
        currentStory = '';  // Reset the current story
        const storyPart = await fetchFullStory(storySummary);
        currentStory += storyPart.text;
        displayStory(currentStory, storyPart.isComplete);
    }

    async function fetchFullStory(storySummary, continuation = '') {
        try {
            const response = await fetch('https://api.cohere.ai/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'command-xlarge-nightly',
                    prompt: `Expand the following brief storyline into a full story within 2000 words: ${storySummary}\n\n${continuation}`,
                    max_tokens: 2200,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            console.log('Full API Response:', data);

            if (data && data.text) {
                const isComplete = data.finish_reason === 'STOP';
                return {
                    text: data.text || "Sorry, couldn't generate the full story.",
                    isComplete
                };
            } else {
                console.error('Unexpected response structure:', data);
                return { text: "Sorry, couldn't generate the full story.", isComplete: true };
            }
        } catch (error) {
            console.error('Failed to fetch full story:', error);
            return { text: "Sorry, couldn't generate the full story.", isComplete: true };
        }
    }

    async function continueStory() {
        const storyPart = await fetchFullStory(storySummary, currentStory);
        currentStory += storyPart.text;
        displayStory(currentStory, storyPart.isComplete);
    }

    function displayStory(storyText, isComplete) {
        const narrationElement = document.getElementById('narration');
        narrationElement.classList.add('story-content-display');
        const lines = storyText.split('\n').filter(line => line.trim() !== '');

    
    const boldedText = lines.map((line, index) => {
        if (index === 0 || line.match(/Chapter|Prologue|Introduction|Summary|Story|Storyline|##/)) {
            return `<h2>${line}</h2>`;
        }
        return `<p>${line}</p>`;
    }).join('');
    
        narrationElement.innerHTML = boldedText;
        let continueButton = document.getElementById('continue-button');
        if (!continueButton) {
            continueButton = document.createElement('button');
            continueButton.id = 'continue-button';
            continueButton.className = 'choice-button';
            continueButton.innerText = 'Continue Story';
            continueButton.style.display = 'none';
            narrationElement.appendChild(continueButton);
        }
    
        if (isComplete) {
            continueButton.style.display = 'none';
        } else {
            continueButton.style.display = 'block';
            continueButton.onclick = continueStory;
        }
    }   
});
