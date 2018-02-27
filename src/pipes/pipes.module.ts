
import { NgModule, ModuleWithProviders } from '@angular/core';

// Pipes
import { DmsBackgroundUrlPipe } from './dmsBackgroundUrl';
import { DmsUrlPipe } from './dmsUrl';
import { UsernamePipe } from './username';
import { UserletterPipe } from './userletter';
import { SincePipe } from './since';
// Providers
import { PipesProvider } from './pipes.provider';

@NgModule({
    declarations:[
        DmsUrlPipe,
        DmsBackgroundUrlPipe,
        UsernamePipe,
        UserletterPipe,
        SincePipe
    ],
    exports:[
        DmsUrlPipe,
        DmsBackgroundUrlPipe,
        UsernamePipe,
        UserletterPipe,
        SincePipe
    ]
})
export class PipesModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: PipesModule,
            providers: [
                PipesProvider
            ]
        }
    }
}
