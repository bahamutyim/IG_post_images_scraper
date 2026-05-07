export class ScrapingError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class RateLimitError extends ScrapingError {
  constructor() {
    super('RATE_LIMITED', 'Instagram rate limited this request');
  }
}

export class LoginWallError extends ScrapingError {
  constructor() {
    super('LOGIN_WALL', 'Instagram requires login for this content');
  }
}

export class PrivateAccountError extends ScrapingError {
  constructor() {
    super('PRIVATE_ACCOUNT', 'This account is private');
  }
}
