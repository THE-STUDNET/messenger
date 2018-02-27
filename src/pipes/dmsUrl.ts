import { Pipe, PipeTransform } from '@angular/core';
import { PipesProvider } from './pipes.provider';
/*
 * Return dms url of an image token
*/
@Pipe({name: 'dmsUrl'})
export class DmsUrlPipe implements PipeTransform {

    constructor( public provider:PipesProvider ){}

    transform( token: string): string {
        return this.provider.dmsUrl( token );
    }
}
