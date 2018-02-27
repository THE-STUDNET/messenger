
import { NgModule, ModuleWithProviders } from '@angular/core';

// Services
import { Events } from './events.provider';

@NgModule({})
export class EventsModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: EventsModule,
            providers: [
                Events
            ]
        }
    }
}

export {
    Events
};
