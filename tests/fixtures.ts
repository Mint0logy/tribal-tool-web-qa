import {test as base, expect} from "@playwright/test"
import { redactSecrets } from "./utils/redactSecrets"

export type TestLogger = {
    log: (message: string) => void
}

export type TestFixtures = {
    logger: TestLogger
}

export const test = base.extend<TestFixtures>({
    logger: async ({page}, use, testInfo) => {
        const entries: string[] = []
    
        const log = (message: string) => {
            entries.push(`${new Date().toISOString()} ${redactSecrets(message)}`)
        }
        
        page.on('console', (message) =>{
            if (message.type()==='error') {
                log(`[console:error] ${message.text()}`)
            }
        })

        await use({ log })
        if (entries.length > 0) {
            await testInfo.attach('test-log.txt', {
            body: entries.join('\n'),
            contentType: 'text/plain',
            })
        }
    }
})

export { expect }