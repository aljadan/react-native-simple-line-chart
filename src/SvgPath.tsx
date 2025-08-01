/* eslint-disable react/no-array-index-key */
import React, {
    JSXElementConstructor,
    ReactElement,
    useCallback,
    useEffect,
    useMemo,
} from 'react';
import {
    interpolate,
    SharedValue,
    useDerivedValue,
} from 'react-native-reanimated';
import {Platform, View} from 'react-native';
import {Defs, LinearGradient, Stop} from 'react-native-svg';
import ActivePoint from './ActivePoint';
import EndPoint from './EndPoint';
import {
    createNewPath,
    getChartMinMaxValue,
    getIndexOfTheNearestXPoint,
    PathObject,
} from './utils';
import {DataPoint, ExtraConfig, Line} from './types';
import {ACTIVE_POINT_CONFIG, END_POINT, EXTRA_CONFIG} from './defaults';
import {AnimatedG, AnimatedPath} from './AnimatedComponents';
import useChartAnimation from './animations/animations';

const SvgPath = ({
    lines,
    svgHeight,
    svgWidth,
    activeTouchX,
    activeTouch,
    extraConfig,
    onPointChange,
    endSpacing,
    initialActivePoint,
    activeLineIndex,
}: {
    lines: Line[];
    svgHeight: number;
    svgWidth: number;
    activeTouchX: SharedValue<number>;
    activeTouch: SharedValue<boolean>;
    extraConfig: ExtraConfig;
    endSpacing: number;
    initialActivePoint?: number;
    onPointChange: (point?: DataPoint) => void;
    activeLineIndex: number;
}) => {
    const allData = lines.reduce((acc, line) => {
        if (line.data !== undefined) {
            if (line.data[0]?.y2 !== undefined) {
                const sideLine = line.data.map(item => {
                    return {
                        x: item.x,
                        y: item?.y2,
                    };
                });
                // @ts-ignore
                acc.concat(sideLine);
            }
            // @ts-ignore
            return acc.concat(line?.data);
        }
        return acc;
    }, []);

    const axisMinMax = useMemo(() => {
        return getChartMinMaxValue({
            allData,
            alwaysStartYAxisFromZero:
                extraConfig.alwaysStartYAxisFromZero || false,
            calculateChartYAxisMinMax:
                extraConfig.calculateChartYAxisMinMax || undefined,
            calculateChartXAxisMinMax:
                extraConfig.calculateChartXAxisMinMax || undefined,
        });
    }, [allData, lines]);

    const activeIndex = useDerivedValue(() => {
        // eslint-disable-next-line no-bitwise
        const activeTouchWithoutDecimals = ~~activeTouchX.value;

        if (activeTouchWithoutDecimals === 0 && initialActivePoint) {
            return initialActivePoint;
        }

        const data = lines[activeLineIndex]?.data || [];
        const dataLength = data.length;

        const minData = axisMinMax.minX;
        const maxData = axisMinMax.maxX;

        const denominator = svgWidth - endSpacing;
        const percentage = (activeTouchWithoutDecimals / denominator) * 100;

        const percentageToTimestampValue = interpolate(
            percentage,
            [0, 100],
            [minData, maxData],
        );

        let activeIndexLocal = getIndexOfTheNearestXPoint(
            data,
            percentageToTimestampValue,
        );

        if (activeIndexLocal >= dataLength) {
            activeIndexLocal = dataLength - 1;
        }

        return activeIndexLocal;
    }, [activeTouchX, lines[activeLineIndex]?.data]);

    return (
        <>
            {lines
                .filter(line => line?.data)
                .map((line, index) => {
                    if (line?.data) {
                        return (
                            <MemoizedLineComponent
                                key={`${index}`}
                                line={line}
                                allData={allData}
                                svgHeight={svgHeight}
                                svgWidth={svgWidth}
                                activeIndex={activeIndex}
                                activeTouch={activeTouch}
                                identifier={`${index}`}
                                extraConfig={extraConfig}
                                onPointChange={
                                    index === activeLineIndex ? onPointChange : undefined
                                }
                                axisMinMax={axisMinMax}
                            />
                        );
                    }
                    // @ts-ignore
                    return <View key={`${index}`} />;
                })}
        </>
    );
};

const LineComponent = ({
    line,
    allData,
    svgHeight,
    svgWidth,
    activeTouch,
    activeIndex,
    identifier,
    extraConfig,
    onPointChange,
    axisMinMax,
}: {
    line: Line;
    allData: DataPoint[];
    svgHeight: number;
    svgWidth: number;
    activeTouch: SharedValue<boolean>;
    activeIndex: SharedValue<number>;
    identifier: string;
    extraConfig: ExtraConfig;
    onPointChange?: (point?: DataPoint) => void;
    axisMinMax: ReturnType<typeof getChartMinMaxValue>;
}) => {
    const isLineColorGradient = Array.isArray(line.lineColor);
    const isRangedLineChart = line.data[0]?.y2 !== undefined;

    const getActivePointColor = useCallback(() => {
        if (line.activePointConfig?.color) {
            return line.activePointConfig.color;
        }
        if (!isLineColorGradient) {
            return line.lineColor as string;
        }
        return ACTIVE_POINT_CONFIG.color;
    }, [line?.activePointConfig?.color, line?.lineColor, isLineColorGradient]);

    const localCreateNewPath = () => {
        return createNewPath({
            data: line?.data || [],
            endSpacing:
                extraConfig.endSpacing === undefined
                    ? EXTRA_CONFIG.endSpacing
                    : extraConfig.endSpacing,
            svgHeight,
            svgWidth,
            isFilled: line.isAreaChart === true,
            curve: line.curve,
            axisMinMax,
        });
    };

    const [isReadyToRenderBackground, setIsReadyToRenderBackground] =
        React.useState(Platform.OS === 'android');
    const [localPath, setLocalPath] = React.useState<PathObject>(
        localCreateNewPath(),
    );

    const {
        startAnimation,
        lineWrapperAnimatedStyle,
        lineAnimatedProps,
        endPointAnimation,
    } = useChartAnimation({
        duration: extraConfig.animationConfig?.duration || 0,
        animationType: extraConfig.animationConfig?.animationType || 'fade',
        path: localPath,
    });

    useEffect(() => {
        const path = localCreateNewPath();

        if (extraConfig.animationConfig && startAnimation) {
            startAnimation({
                action: () => {
                    setLocalPath(path);
                },
            });
        } else {
            setLocalPath(path);
        }
    }, [
        line?.data
            .map(item => {
                if (item.y2) {
                    return `${item.y}${item.y2}`;
                }
                return item?.y;
            })
            .join(''),
        line.curve,
        line.key,
        allData,
    ]);

    const getBackgroundIdentifier = () => {
        return `${identifier}`;
    };

    const getStopPoints = useCallback(() => {
        const getColors = () => {
            if (isLineColorGradient) {
                return line.lineColor as string[];
            }
            return [
                line.lineColor as string, // leading opacity
                line.lineColor as string, // controlling position of the leading opacity
                line.lineColor as string, // controlling position of the trailing opacity
                line.lineColor as string, // trailing opacity
            ];
        };

        const colors = getColors();

        return colors.map((color, index) => {
            const defaultOffset = 100 - (index / (colors.length - 1)) * 100;

            const getOffset = () => {
                if (
                    isLineColorGradient ||
                    index === 0 ||
                    index === colors?.length - 1
                ) {
                    return defaultOffset;
                }

                if (index === 1) {
                    if (
                        typeof line?.leadingOpacity === 'object' &&
                        line?.leadingOpacity?.leadingPercentage
                    ) {
                        return (
                            100 - line?.leadingOpacity?.leadingPercentage / 2
                        );
                    } else {
                        return 50;
                    }
                }
                if (index === colors.length - 2) {
                    if (
                        typeof line?.trailingOpacity === 'object' &&
                        line?.trailingOpacity?.trailingPercentage
                    ) {
                        return line?.trailingOpacity?.trailingPercentage / 2;
                    } else {
                        return 50;
                    }
                }

                return defaultOffset;
            };

            const getStopOpacity = () => {
                if (index === 0 && line.leadingOpacity !== undefined) {
                    if (typeof line.leadingOpacity === 'object') {
                        return `${line.leadingOpacity.opacity}`;
                    }
                    return `${line.leadingOpacity}`;
                }

                if (
                    index === colors.length - 1 &&
                    line.trailingOpacity !== undefined
                ) {
                    if (typeof line.trailingOpacity === 'object') {
                        return `${line.trailingOpacity.opacity}`;
                    }
                    return `${line.trailingOpacity}`;
                }

                return '1';
            };

            return (
                <Stop
                    key={`${index}`}
                    offset={`${getOffset()}%`}
                    stopColor={color}
                    stopOpacity={getStopOpacity()}
                />
            );
        });
    }, [line.lineColor, line.trailingOpacity]);

    const {pathStartX, pathEndX} = useMemo(() => {
        const pathStartX = line?.data[0]?.x
            ? localPath?.x(line?.data[0]?.x)
            : 0;
        const pathEndX = line?.data[line?.data?.length - 1]?.x
            ? localPath?.x(line?.data[line?.data?.length - 1]?.x || 0)
            : svgWidth;
        return {
            pathStartX,
            pathEndX,
        };
    }, []);

    return (
        <>
            {isReadyToRenderBackground &&
                pathStartX !== undefined &&
                pathEndX !== undefined && (
                    <Defs>
                        <LinearGradient
                            id={getBackgroundIdentifier()}
                            gradientUnits="userSpaceOnUse"
                            y1="0"
                            y2="0"
                            x1={pathEndX}
                            x2={pathStartX}
                        >
                            {
                                getStopPoints() as ReactElement<
                                    any,
                                    string | JSXElementConstructor<any>
                                >[]
                            }
                        </LinearGradient>
                    </Defs>
                )}

            <AnimatedG
                // @ts-ignore
                style={
                    lineWrapperAnimatedStyle
                        ? {
                              ...lineWrapperAnimatedStyle,
                          }
                        : undefined
                }
            >
                <AnimatedPath
                    onLayout={e => {
                        // this is a hack to fix the ios flashes white on mount
                        if (
                            Number.isFinite(e.nativeEvent.layout.width) &&
                            Platform.OS === 'ios'
                        ) {
                            setTimeout(() => {
                                setIsReadyToRenderBackground(true);
                            }, 20);
                        }
                    }}
                    strokeLinecap="round"
                    stroke={`url(#${getBackgroundIdentifier()})`}
                    strokeWidth={
                        line.lineWidth === undefined ? 2 : line.lineWidth
                    }
                    fill={
                        (line.isAreaChart !== undefined &&
                            line.isAreaChart === true) ||
                        isRangedLineChart
                            ? `url(#${getBackgroundIdentifier()})`
                            : 'transparent'
                    }
                    fillOpacity={line?.fillOpacity}
                    animatedProps={lineAnimatedProps}
                    strokeDasharray={line.strokeDasharray}
                />

                {line.endPointConfig && endPointAnimation && (
                    <EndPoint
                        x={localPath?.x(
                            localPath?.data[localPath.data.length - 1]?.x || 0,
                        )}
                        y={localPath?.y(
                            localPath?.data[localPath.data.length - 1]?.y || 0,
                        )}
                        color={line.endPointConfig?.color || END_POINT.color}
                        animated={
                            line.endPointConfig?.animated || END_POINT.animated
                        }
                        radius={line.endPointConfig?.radius || END_POINT.radius}
                        endPointAnimation={endPointAnimation}
                    />
                )}
            </AnimatedG>

            {line !== undefined && line.activePointConfig !== undefined && (
                <ActivePoint
                    data={localPath?.data || []}
                    activeTouch={activeTouch}
                    width={svgWidth}
                    height={svgHeight}
                    activePointComponent={line.activePointComponent}
                    activePointComponentWithSharedValue={
                        line.activePointComponentWithSharedValue
                    }
                    activeIndex={activeIndex}
                    path={localPath}
                    onPointChange={onPointChange}
                    color={getActivePointColor()}
                    borderColor={
                        line?.activePointConfig?.borderColor ||
                        ACTIVE_POINT_CONFIG.borderColor
                    }
                    borderWidth={
                        line?.activePointConfig?.borderWidth !== undefined &&
                        line?.activePointConfig?.borderWidth >= 0
                            ? line?.activePointConfig?.borderWidth
                            : ACTIVE_POINT_CONFIG.borderWidth
                    }
                    showVerticalLine={
                        line?.activePointConfig?.showVerticalLine !== undefined
                            ? line?.activePointConfig?.showVerticalLine
                            : ACTIVE_POINT_CONFIG.showVerticalLine
                    }
                    showActivePointCircle={
                        line?.activePointConfig?.showActivePointCircle !==
                        undefined
                            ? line?.activePointConfig?.showActivePointCircle
                            : ACTIVE_POINT_CONFIG.showActivePointCircle
                    }
                    verticalLineColor={
                        line?.activePointConfig?.verticalLineColor ||
                        ACTIVE_POINT_CONFIG.verticalLineColor
                    }
                    verticalLineWidth={
                        line?.activePointConfig?.verticalLineWidth ||
                        ACTIVE_POINT_CONFIG.verticalLineWidth
                    }
                    verticalLineDashArray={
                        line?.activePointConfig?.verticalLineDashArray ||
                        ACTIVE_POINT_CONFIG.verticalLineDashArray
                    }
                    verticalLineOpacity={
                        line?.activePointConfig?.verticalLineOpacity ||
                        ACTIVE_POINT_CONFIG.verticalLineOpacity
                    }
                    animateTransition={
                        line?.activePointConfig?.animateTransition !== undefined
                            ? line?.activePointConfig?.animateTransition
                            : ACTIVE_POINT_CONFIG.animateTransition
                    }
                    radius={
                        line?.activePointConfig?.radius ||
                        ACTIVE_POINT_CONFIG.radius
                    }
                />
            )}
        </>
    );
};

const MemoizedLineComponent = React.memo(LineComponent, (prev, next) => {
    return (
        prev.line.data.length === next.line.data.length &&
        prev.line.curve === next.line.curve &&
        prev.line.lineColor === next.line.lineColor &&
        prev.line.key === next.line.key &&
        prev.allData
            .map(item => {
                if (item?.y2 !== undefined) {
                    return `${item.y}${item.y2}`;
                }
                return item?.y;
            })
            .join('') ===
            next.allData
                .map(item => {
                    if (item?.y2 !== undefined) {
                        return `${item.y}${item.y2}`;
                    }
                    return item?.y;
                })
                .join('')
    );
});

export default SvgPath;
