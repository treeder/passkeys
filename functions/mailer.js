export class ConsoleMailer {
  async send(c, opts) {
    console.log(`THIS SHOULD BE REPLACED WITH A PROPER MAILER
      
to: ${opts.to}
subject: ${opts.subject}

${opts.body}`)
  }
} 