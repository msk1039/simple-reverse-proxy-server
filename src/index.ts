import { program } from 'commander';
import { parseYAMLConfig,validateConfig} from './config'
import os from 'node:os'
import { createServer } from './server';


  
async function main(){
    // console.log("hello")
    program
        .option('--config <path>', 'path to the config file');
    program.parse();
    const options = program.opts();
    
    if(options && 'config' in options){
        
        const validatedConfig = await validateConfig(
            await parseYAMLConfig(options.config)
        );
        // console.log(validatedConfig)

        await createServer({
            port: validatedConfig.server.listen,
            workerCount: validatedConfig.server.workers ?? os.cpus().length,
            config: validatedConfig
        });
    }

}


main()