import { AxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import * as dotenv from 'dotenv';

//Supporting legacy node versions
import axios = require('axios');

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
        const response = await axios.default.post(process.env.API_URL!, body, { headers });
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

function displayResults(startTime: number) {
    const successfulRequests = results.filter((result) => result.status !== null);
    const failedRequests = results.filter((result) => result.status === null);
    const avgDuration =
        results.reduce((total, result) => total + result.duration, 0) / results.length;

    const endTime = Date.now();
    console.log(`Total requests: ${results.length}`);
    console.log(`Successful requests: ${successfulRequests.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    console.log(`Average request duration: ${avgDuration.toFixed(2)} ms`);

    const totalTimeInSeconds = (endTime - startTime) / 1000;
    const requestsPerMinute = successfulRequests.length / totalTimeInSeconds * 60;

    console.log(`Requests per second: ${requestsPerMinute.toFixed(2)}`);
}

(async () => {
    const promises = [];

    const startTime = Date.now();
    for (let i = 0; i < parseInt(process.env.TOTAL_REQUESTS!); i++) {
        promises.push(limiter.schedule(makeRequest));
    }

    Promise.all(promises).then(() => {
        displayResults(startTime);
    });
})();