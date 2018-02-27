import { Pipe, PipeTransform } from '@angular/core';
import { PipesProvider } from './pipes.provider';
/*
 * Return dms url of an image token
*/
@Pipe({name: 'userletter'})
export class UserletterPipe implements PipeTransform {

    constructor( public provider:PipesProvider ){}

    transform( user:any ): any{
        return this.provider.userletter( user );
    }
}
