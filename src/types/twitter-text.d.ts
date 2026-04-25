declare module "twitter-text" {
  export interface ParsedTweet {
    weightedLength: number;
    valid: boolean;
    permillage: number;
    displayRangeStart: number;
    displayRangeEnd: number;
    validRangeStart: number;
    validRangeEnd: number;
  }

  const twitterText: {
    parseTweet(text: string): ParsedTweet;
  };

  export default twitterText;
}
