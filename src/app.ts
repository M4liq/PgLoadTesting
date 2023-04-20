import axios from 'axios';
import { AxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import dotenv from 'dotenv';

dotenv.config();

const limiter = new Bottleneck({
    maxConcurrent: parseInt(process.env.CONCURRENT_REQUESTS!) as number,
    minTime: 1000 / parseInt(process.env.REQUESTS_PER_SECOND!) as number,
});

interface RequestResult {
    status: number | null;
    duration: number;
}

const results: RequestResult[] = [];

async function makeRequest() {
    const headers = {
        'X-Client-Secret': process.env.CLIENT_SECRET,
        'X-Client-Id': process.env.X_CLIENT_ID,
        'Content-Type': 'application/json',
    };

    const body = JSON.parse(process.env.JSON_BODY!);
    const startTime = Date.now();

    try {
        const response = await axios.post(process.env.API_URL!, body, { headers });
        console.log('Request succeeded:', response.status, response.data);
        results.push({ status: response.status, duration: Date.now() - startTime });
    } catch (error) {
        if (error && (error as AxiosError).isAxiosError) {
            const axiosError = error as AxiosError;
            console.error('Request failed:', axiosError.message);
            if (axiosError.response) {
                console.error('Response body:', axiosError.response.data);
            }
        } else {
            console.error('Request failed:', error);
        }

        results.push({ status: null, duration: Date.now() - startTime });
    }
}

function displayResults() {
    const successfulRequests = results.filter((result) => result.status !== null);
    const failedRequests = results.filter((result) => result.status === null);
    const avgDuration =
        results.reduce((total, result) => total + result.duration, 0) / results.length;

    console.log(`Total requests: ${results.length}`);
    console.log(`Successful requests: ${successfulRequests.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    console.log(`Average request duration: ${avgDuration.toFixed(2)} ms`);
}

(async () => {
    const promises = [];

    for (let i = 0; i < parseInt(process.env.TOTAL_REQUESTS!); i++) {
        promises.push(limiter.schedule(makeRequest));
    }

    Promise.all(promises).then(() => {
        displayResults();
    });
})();