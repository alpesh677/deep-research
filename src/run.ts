import * as fs from 'fs/promises';
import * as readline from 'readline';



import { modelProvider } from './ai';
import { deepResearch, writeFinalReport } from './deep-research';
import { generateFeedback } from './feedback';
import { OutputManager } from './output-manager';


const output = new OutputManager();

// Helper function for consistent logging
function log(...args: any[]) {
  output.log(...args);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// run the agent
if (process.env.GOOGLE_API_KEY){
  console.log("Google API Key is not set");
}
  async function run() {
    const modelChoice = await askQuestion(
      'Selece AI Model (1 for OpenAI, 2 for Gemini, default 1): ',
    );

    if (modelChoice === '2') {
      modelProvider.setProvider('gemini');
    } else {
      modelProvider.setProvider('openai');
    }

    const initialQuery = await askQuestion('What would you like to research? ');

    const breadth =
      parseInt(
        await askQuestion(
          'Enter research breadth (recommended 2-10, default 4): ',
        ),
        10,
      ) || 4;

    const depth =
      parseInt(
        await askQuestion(
          'Enter research depth (recommended 1-5, default 2): ',
        ),
        10,
      ) || 2;

    log(`Creating research plan for query: ${initialQuery}`);

    const followUpQuestions = await generateFeedback({
      query: initialQuery,
    });

    log(
      '\nTo better understand your research needs, please answer these follow-up questions:',
    );

    const answers: string[] = [];

    for (const question of followUpQuestions) {
      const answer = await askQuestion(`\n${question}\nYour answer:`);
      answers.push(answer);
    }

    const combinedQuery = `
  Initial Query: ${initialQuery}
  Follow-up Questions and Answers:
  ${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
  `;

    log('\nResearching your topic...');

    log('\nStarting research with progress tracking...\n');

    const { learnings, visitedUrls } = await deepResearch({
      query: combinedQuery,
      breadth,
      depth,
      onProgress: progress => {
        output.updateProgress(progress);
      },
    });

    log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
    log(
      `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
    );
    log('Writing final report...');

    const report = await writeFinalReport({
      prompt: combinedQuery,
      learnings,
      visitedUrls,
    });

    // Save report to file
    await fs.writeFile('output.md', report, 'utf-8');

    console.log(`\n\nFinal Report:\n\n${report}`);
    console.log('\nReport has been saved to output.md');
    rl.close();
  }

run().catch(console.error);