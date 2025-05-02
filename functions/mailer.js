export class ConsoleMailer {
  async send(opts) {
    console.log(`THIS SHOULD BE REPLACED WITH A PROPER MAILER
      
to: ${opts.to}
subject: ${opts.subject}

${opts.body}`)
  }
} 