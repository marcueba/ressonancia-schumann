const fs = require('fs');

function addRelativeIntensity(file) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('relativeIntensity?:')) {
        content = content.replace(
            /is_demo\??: boolean;/,
            "is_demo?: boolean;\n  relativeIntensity?: {\n    value: number;\n    scale: string;\n    calibrated: boolean;\n    source: string;\n  };"
        );
        fs.writeFileSync(file, content);
    }
}

addRelativeIntensity('server/types.ts');
addRelativeIntensity('src/types/index.ts');
