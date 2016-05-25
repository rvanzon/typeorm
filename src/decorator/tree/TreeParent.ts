import {getMetadataArgsStorage} from "../../index";
import {RelationOptions} from "../../metadata/options/RelationOptions";
import {RelationTypes} from "../../metadata/types/RelationTypes";
import {RelationMetadataArgs} from "../../metadata/args/RelationMetadataArgs";

/**
 * Marks a specific property of the class as a parent of the tree.
 */
export function TreeParent(options?: RelationOptions): Function {
    return function (object: Object, propertyName: string) {
        if (!options) options = {} as RelationOptions;

        const reflectedType = (Reflect as any).getMetadata("design:type", object, propertyName);
        const args: RelationMetadataArgs = {
            isTreeParent: true,
            target: object.constructor,
            propertyName: propertyName,
            propertyType: reflectedType,
            relationType: RelationTypes.MANY_TO_ONE,
            type: () => object.constructor,
            options: options
        };
        getMetadataArgsStorage().relations.add(args);
    };
}

