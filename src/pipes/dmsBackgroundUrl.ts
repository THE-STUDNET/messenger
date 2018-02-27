import { Pipe, PipeTransform } from '@angular/core';
import { PipesProvider } from './pipes.provider';
/*
 * Return dms url of an image token
*/
@Pipe({name: 'dmsBgUrl'})
export class DmsBackgroundUrlPipe implements PipeTransform {
    constructor( public provider:PipesProvider ){}

    transform( token: string): any {
        return this.provider.dmsBackgroundUrl( token );
    }
}
