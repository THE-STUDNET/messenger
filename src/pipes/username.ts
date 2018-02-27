import { Pipe, PipeTransform } from '@angular/core';
import { PipesProvider } from './pipes.provider';
/*
 * Return dms url of an image token
*/
@Pipe({name: 'username'})
export class UsernamePipe implements PipeTransform {

    constructor( public provider:PipesProvider ){}

    transform( user: any, short?: boolean, you?: boolean): any {
        return this.provider.username( user, short, you );
    }
}
