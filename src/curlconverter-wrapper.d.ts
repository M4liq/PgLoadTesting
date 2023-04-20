declare module './curlconverter-wrapper.cjs' {
    const curlconverterWrapper: {
        toAxios(curlCommand: string): any;
    };

    export = curlconverterWrapper;
}