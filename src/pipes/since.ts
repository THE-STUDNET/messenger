import { Pipe, PipeTransform } from '@angular/core';
import { PipesProvider } from './pipes.provider';
/*
 * Return formatted date
*/
@Pipe({name: 'since'})
export class SincePipe implements PipeTransform {

    constructor( public provider:PipesProvider ){}

    transform( date:string ): any{
        return this.provider.since( date );
    }
}
